import { useState, useEffect } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FixedSizeList } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  loginAdmin, 
  getAllRestaurants, 
  getRestaurantDetails, 
  getRestaurantReservations,
  getRestaurantRatings,
  getRestaurantTables,
  getRestaurantUsers,
  isAdminAuthenticated, 
  logoutAdmin,
  updateRestaurantApproval,
  deleteRestaurant as deleteRestaurantApi,
  type AdminRestaurant,
  type AdminRestaurantDetails,
  type PaginationMeta,
  type PaginatedResponse,
  type AdminReservationDetail,
  type AdminRatingDetail,
  type AdminTableDetail,
  type AdminUserDetail,
} from '../services/adminApi';
import { toast } from 'sonner';
import { 
  LogOut, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Eye,
  FileText,
  Mail,
  Phone,
  Star
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function AdminPanel() {
  const queryClient = useQueryClient();
  const [authenticated, setAuthenticated] = useState(() => isAdminAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(10);
  const [expandedRestaurantId, setExpandedRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) {
      setExpandedRestaurantId(null);
      setListPage(1);
      setListLimit(10);
      setSearchInput('');
      queryClient.clear();
    }
  }, [authenticated, queryClient]);

  useEffect(() => {
    setListPage(1);
  }, [debouncedSearch]);

  const restaurantsQuery = useQuery<{ restaurants: AdminRestaurant[]; pagination: PaginationMeta }, Error>({
    queryKey: ['admin-restaurants', { page: listPage, limit: listLimit, search: debouncedSearch }],
    queryFn: () => getAllRestaurants({ page: listPage, limit: listLimit, search: debouncedSearch }),
    enabled: authenticated,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!restaurantsQuery.error) return;
    const message = (restaurantsQuery.error as Error).message || 'Failed to load restaurants';
    toast.error(message);
    if (message.includes('Session expired') || message.includes('Not authenticated')) {
      setAuthenticated(false);
    }
  }, [restaurantsQuery.error]);

  const detailsQuery = useQuery<AdminRestaurantDetails, Error>({
    queryKey: ['admin-restaurant-details', expandedRestaurantId],
    queryFn: () => getRestaurantDetails(expandedRestaurantId!),
    enabled: authenticated && !!expandedRestaurantId,
    staleTime: 60_000,
  });

  const restaurants: AdminRestaurant[] = restaurantsQuery.data?.restaurants ?? [];
  const listPagination: PaginationMeta = restaurantsQuery.data?.pagination ?? {
    page: listPage,
    limit: listLimit,
    total: 0,
    totalPages: 1,
  };
  const listPageStart = listPagination.total === 0 ? 0 : (listPagination.page - 1) * listPagination.limit + 1;
  const listPageEnd = Math.min(listPagination.page * listPagination.limit, listPagination.total);
  const canListGoPrev = listPagination.page > 1;
  const canListGoNext = listPagination.page < listPagination.totalPages;
  const listLoading = restaurantsQuery.isLoading && restaurants.length === 0;
  const listFetching = restaurantsQuery.isFetching;
  const isDetailsLoading = detailsQuery.isLoading && !!expandedRestaurantId;
  const selectedRestaurantDetails = detailsQuery.data ?? null;

  const approvalMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'pending' | 'approved' | 'denied'; notes?: string }) =>
      updateRestaurantApproval(id, status, notes),
    onSuccess: (_data, variables) => {
      toast.success(`Restaurant marked as ${variables.status}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-restaurant-details', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update approval status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRestaurantApi(id),
    onSuccess: (_data, id) => {
      toast.success('Restaurant deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
      queryClient.removeQueries({ queryKey: ['admin-restaurant-details', id] });
      if (expandedRestaurantId === id) {
        setExpandedRestaurantId(null);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete restaurant');
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await loginAdmin(username, password);
      setAuthenticated(true);
      setSearchInput('');
      toast.success('Login successful');
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setAuthenticated(false);
    setExpandedRestaurantId(null);
    toast.success('Logged out');
  };


  const handleListPageChange = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1;
    const nextPage = listPagination.page + delta;
    const bounded = Math.min(Math.max(nextPage, 1), Math.max(1, listPagination.totalPages));
    if (bounded === listPagination.page) return;
    setListPage(bounded);
  };

  const handleListLimitChange = (value: number) => {
    if (value === listLimit) return;
    setListLimit(value);
    setListPage(1);
  };

  const handleApprovalChange = async (id: string, status: 'pending' | 'approved' | 'denied') => {
    let notes: string | undefined;
    if (status === 'denied') {
      const input = window.prompt('Share a short note for the restaurant (optional):');
      if (input === null) {
        return;
      }
      notes = input;
    }
    approvalMutation.mutate({ id, status, notes });
  };

  const handleDeleteRestaurant = async (id: string) => {
    const confirmed = window.confirm('This will permanently delete the restaurant, staff logins, reservations, and uploads. Continue?');
    if (!confirmed) return;
    deleteMutation.mutate(id);
  };

  const toggleRestaurantDetails = (id: string, nextOpen?: boolean) => {
    if (typeof nextOpen === 'boolean') {
      setExpandedRestaurantId(prev => (nextOpen ? id : prev === id ? null : prev));
      return;
    }
    setExpandedRestaurantId(prev => (prev === id ? null : id));
  };

  const getFileUrl = (fileId: string) => {
    return `${API_URL}/media/${fileId}`;
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: '#F3F4F6'}}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{background: '#F3F4F6'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-gray-600">
                Total: {listPagination.total} restaurant{listPagination.total !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant List */}
        <div className="space-y-2">
          {listLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading restaurants...</p>
              </CardContent>
            </Card>
          ) : listPagination.total === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-600">
                No restaurants found
              </CardContent>
            </Card>
          ) : (
            restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden">
                <Collapsible
                  open={expandedRestaurantId === restaurant.id}
                  onOpenChange={(open: boolean) => toggleRestaurantDetails(restaurant.id, open)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                            <Badge variant="outline">{restaurant.city}</Badge>
                            <Badge variant="secondary">{restaurant.cuisine}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {restaurant.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {restaurant.email}
                              </div>
                            )}
                            {restaurant.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {restaurant.phone}
                              </div>
                            )}
                            <div className="flex items-center gap-4 ml-auto">
                              <span className="text-xs">
                                Files: {restaurant.fileCount} | 
                                Reservations: {restaurant.reservationCount} | 
                                Ratings: {restaurant.ratingCount} | 
                                Tables: {restaurant.tableCount} | 
                                Users: {restaurant.userCount}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          {expandedRestaurantId === restaurant.id && isDetailsLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                          ) : expandedRestaurantId === restaurant.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {expandedRestaurantId === restaurant.id ? (
                        isDetailsLoading ? (
                          <div className="p-4 text-center text-gray-500">Loading details...</div>
                        ) : detailsQuery.isError ? (
                          <div className="p-4 text-center text-red-500">
                            {(detailsQuery.error as Error)?.message || 'Failed to load details'}
                          </div>
                        ) : selectedRestaurantDetails ? (
                          <RestaurantDetails
                            details={selectedRestaurantDetails}
                            getFileUrl={getFileUrl}
                            onApprovalChange={handleApprovalChange}
                            onDelete={handleDeleteRestaurant}
                          />
                        ) : (
                          <div className="p-4 text-center text-gray-500">Select a restaurant to load details.</div>
                        )
                      ) : null}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
        {listPagination.total > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
            <div className="text-sm text-gray-600">
              Showing {listPagination.total === 0 ? 0 : listPageStart} - {listPagination.total === 0 ? 0 : listPageEnd} of {listPagination.total}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Per page</span>
                <Select
                  value={String(listPagination.limit)}
                  onValueChange={(value: string) => handleListLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleListPageChange('prev')}
                  disabled={!canListGoPrev || listFetching}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {listPagination.page} of {listPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleListPageChange('next')}
                  disabled={!canListGoNext || listFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RestaurantDetails({
  details,
  getFileUrl,
  onApprovalChange,
  onDelete,
}: {
  details: AdminRestaurantDetails;
  getFileUrl: (fileId: string) => string;
  onApprovalChange: (id: string, status: 'pending' | 'approved' | 'denied') => void;
  onDelete: (id: string) => void;
}) {
  const restaurant = details.restaurant;
  const [activeTab, setActiveTab] = useState('basic');
  const [reservationsPage, setReservationsPage] = useState(1);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [tablesPage, setTablesPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const RESERVATIONS_LIMIT = 25;
  const RATINGS_LIMIT = 20;
  const TABLES_LIMIT = 25;
  const USERS_LIMIT = 20;

  const filesByCategory = {
    license: restaurant.mediaRefs?.filter(f => f.category === 'license') || [],
    menu: restaurant.mediaRefs?.filter(f => f.category === 'menu') || [],
    'profile-picture': restaurant.mediaRefs?.filter(f => f.category === 'profile-picture') || [],
    other: restaurant.mediaRefs?.filter(f => f.category === 'other') || [],
  };

  useEffect(() => {
    setActiveTab('basic');
    setReservationsPage(1);
    setRatingsPage(1);
    setTablesPage(1);
    setUsersPage(1);
  }, [details.restaurant.id]);

  const reservationsQuery = useQuery<PaginatedResponse<AdminReservationDetail>, Error>({
    queryKey: ['admin-reservations', restaurant.id, reservationsPage, RESERVATIONS_LIMIT],
    queryFn: () => getRestaurantReservations(restaurant.id, { page: reservationsPage, limit: RESERVATIONS_LIMIT }),
    enabled: activeTab === 'reservations',
    placeholderData: keepPreviousData,
  });

  const ratingsQuery = useQuery<PaginatedResponse<AdminRatingDetail>, Error>({
    queryKey: ['admin-ratings', restaurant.id, ratingsPage, RATINGS_LIMIT],
    queryFn: () => getRestaurantRatings(restaurant.id, { page: ratingsPage, limit: RATINGS_LIMIT }),
    enabled: activeTab === 'ratings',
    placeholderData: keepPreviousData,
  });

  const tablesQuery = useQuery<PaginatedResponse<AdminTableDetail>, Error>({
    queryKey: ['admin-tables', restaurant.id, tablesPage, TABLES_LIMIT],
    queryFn: () => getRestaurantTables(restaurant.id, { page: tablesPage, limit: TABLES_LIMIT }),
    enabled: activeTab === 'tables',
    placeholderData: keepPreviousData,
  });

  const usersQuery = useQuery<PaginatedResponse<AdminUserDetail>, Error>({
    queryKey: ['admin-users', restaurant.id, usersPage, USERS_LIMIT],
    queryFn: () => getRestaurantUsers(restaurant.id, { page: usersPage, limit: USERS_LIMIT }),
    enabled: activeTab === 'users',
    placeholderData: keepPreviousData,
  });

  const reservationsPagination = getPaginationFromQuery(reservationsQuery.data, reservationsPage, RESERVATIONS_LIMIT);
  const ratingsPagination = getPaginationFromQuery(ratingsQuery.data, ratingsPage, RATINGS_LIMIT);
  const tablesPagination = getPaginationFromQuery(tablesQuery.data, tablesPage, TABLES_LIMIT);
  const usersPagination = getPaginationFromQuery(usersQuery.data, usersPage, USERS_LIMIT);

  const handleReservationsPageChange = (nextPage: number) => {
    const bounded = clampPage(nextPage, reservationsPagination);
    if (bounded === reservationsPage) return;
    setReservationsPage(bounded);
    if (activeTab !== 'reservations') {
      setActiveTab('reservations');
    }
  };

  const handleRatingsPageChange = (nextPage: number) => {
    const bounded = clampPage(nextPage, ratingsPagination);
    if (bounded === ratingsPage) return;
    setRatingsPage(bounded);
    if (activeTab !== 'ratings') {
      setActiveTab('ratings');
    }
  };

  const handleTablesPageChange = (nextPage: number) => {
    const bounded = clampPage(nextPage, tablesPagination);
    if (bounded === tablesPage) return;
    setTablesPage(bounded);
    if (activeTab !== 'tables') {
      setActiveTab('tables');
    }
  };

  const handleUsersPageChange = (nextPage: number) => {
    const bounded = clampPage(nextPage, usersPagination);
    if (bounded === usersPage) return;
    setUsersPage(bounded);
    if (activeTab !== 'users') {
      setActiveTab('users');
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="reservations">Reservations</TabsTrigger>
        <TabsTrigger value="ratings">Ratings</TabsTrigger>
        <TabsTrigger value="tables">Tables</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Name</Label>
                <p className="text-sm">{restaurant.name}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">City</Label>
                <p className="text-sm">{restaurant.city}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Cuisine</Label>
                <p className="text-sm">{restaurant.cuisine}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Price Range</Label>
                <p className="text-sm">{restaurant.priceRange || 'N/A'}</p>
              </div>
              {restaurant.email && (
                <div>
                  <Label className="text-sm font-semibold">Email</Label>
                  <p className="text-sm">{restaurant.email}</p>
                </div>
              )}
              {restaurant.phone && (
                <div>
                  <Label className="text-sm font-semibold">Phone</Label>
                  <p className="text-sm">{restaurant.phone}</p>
                </div>
              )}
              {restaurant.address && (
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Address</Label>
                  <p className="text-sm">{restaurant.address}</p>
                </div>
              )}
              {restaurant.openingHours && (
                <div>
                  <Label className="text-sm font-semibold">Opening Hours</Label>
                  <p className="text-sm">{restaurant.openingHours}</p>
                </div>
              )}
              {restaurant.closingHours && (
                <div>
                  <Label className="text-sm font-semibold">Closing Hours</Label>
                  <p className="text-sm">{restaurant.closingHours}</p>
                </div>
              )}
              {restaurant.description && (
                <div className="col-span-2">
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-sm">{restaurant.description}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold">Created</Label>
                <p className="text-sm">{new Date(restaurant.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Updated</Label>
                <p className="text-sm">{new Date(restaurant.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Reservations', value: details.stats.reservations },
                { label: 'Ratings', value: details.stats.ratings },
                { label: 'Tables', value: details.stats.tables },
                { label: 'Staff', value: details.stats.users },
              ].map((stat) => (
                <div key={stat.label} className="border rounded-lg p-3 bg-white">
                  <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <Label className="text-sm font-semibold">Approval status</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge
                      className={
                        restaurant.approvalStatus === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : restaurant.approvalStatus === 'denied'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {(restaurant.approvalStatus || 'pending').toUpperCase()}
                    </Badge>
                  </div>
                  {restaurant.approvalNotes && (
                    <p className="text-xs text-gray-600 mt-2">
                      Latest note: {restaurant.approvalNotes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onApprovalChange(restaurant.id, 'approved')}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onApprovalChange(restaurant.id, 'pending')}>
                    Mark pending
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onApprovalChange(restaurant.id, 'denied')}>
                    Deny
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 flex-wrap border-t pt-4">
                <div>
                  <Label className="text-sm font-semibold text-red-600">Delete restaurant</Label>
                  <p className="text-xs text-gray-600">
                    Permanently remove this restaurant, its staff, reservations, and files.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => onDelete(restaurant.id)}>
                  Delete
                </Button>
              </div>
            </div>

            {restaurant.menu && restaurant.menu.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-semibold mb-2 block">Menu Items</Label>
                <div className="space-y-2">
                  {restaurant.menu.map((item, idx) => (
                    <div key={idx} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600">{item.description}</p>
                          )}
                        </div>
                        <p className="font-semibold">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="files" className="mt-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {Object.entries(filesByCategory).map(([category, files]) => {
                if (files.length === 0) return null;
                return (
                  <div key={category}>
                    <h3 className="font-semibold mb-3 capitalize">{category.replace('-', ' ')} ({files.length})</h3>
                    <div className="space-y-3">
                      {files.map((file, idx) => (
                        <div key={idx} className="border rounded p-4 flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {file.type === 'image' ? (
                              <div className="w-24 h-24 border rounded overflow-hidden bg-gray-100">
                                <img
                                  src={getFileUrl(file.fileId)}
                                  alt={file.filename}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-24 h-24 border rounded flex items-center justify-center bg-gray-100">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{file.filename}</p>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                  <Badge variant="outline" className="text-xs">
                                    {file.type}
                                  </Badge>
                                  <Badge variant={file.isActive ? 'default' : 'secondary'} className="text-xs">
                                    {file.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                  {file.menuType && (
                                    <Badge variant="outline" className="text-xs">
                                      {file.menuType}
                                    </Badge>
                                  )}
                                  <span className="text-xs">v{file.version}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Uploaded: {new Date(file.uploadedAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Content Type: {file.contentType}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(getFileUrl(file.fileId), '_blank')}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = getFileUrl(file.fileId);
                                    link.download = file.filename;
                                    link.click();
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {restaurant.mediaRefs?.length === 0 && (
                <p className="text-center text-gray-500 py-8">No files uploaded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reservations" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            {reservationsQuery.isLoading && !reservationsQuery.data ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                Loading reservations...
              </div>
            ) : (reservationsQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-center text-gray-500 py-8">No reservations</p>
            ) : (
              <VirtualizedList
                items={reservationsQuery.data?.items || []}
                itemHeight={140}
                renderItem={(reservation) => (
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold">{reservation.name || 'Walk-in guest'}</p>
                        <p className="text-xs text-gray-500">{reservation.mode === 'waitlist' ? 'Waitlist' : 'Reservation'}</p>
                      </div>
                      <Badge>
                        {reservation.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3">
                      <div>
                        <p className="text-gray-500 uppercase">Party</p>
                        <p className="font-medium text-sm">{reservation.partySize}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase">Requested</p>
                        <p className="font-medium">{new Date(reservation.requestedAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase">Confirmed</p>
                        <p className="font-medium">
                          {reservation.confirmedAt ? new Date(reservation.confirmedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 uppercase">Seated</p>
                        <p className="font-medium">
                          {reservation.seatedAt ? new Date(reservation.seatedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-600 space-x-3">
                      {reservation.email && <span>{reservation.email}</span>}
                      {reservation.phone && <span>{reservation.phone}</span>}
                      {reservation.queuePosition !== undefined && (
                        <span>Queue #{reservation.queuePosition}</span>
                      )}
                    </div>
                  </div>
                )}
              />
            )}
            <TabPaginationControls
              pagination={reservationsPagination}
              loading={reservationsQuery.isFetching}
              onPageChange={handleReservationsPageChange}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ratings" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            {ratingsQuery.isLoading && !ratingsQuery.data ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                Loading ratings...
              </div>
            ) : (ratingsQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-center text-gray-500 py-8">No ratings</p>
            ) : (
              <VirtualizedList
                items={ratingsQuery.data?.items || []}
                itemHeight={120}
                renderItem={(rating) => (
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{rating.value.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(rating.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm mt-2">{rating.comment || 'No comment'}</p>
                    <div className="text-xs text-gray-600 mt-2 space-y-1">
                      <p>{rating.showName && rating.name ? rating.name : 'Anonymous'}</p>
                      {rating.email && <p>{rating.email}</p>}
                      {rating.phone && <p>{rating.phone}</p>}
                    </div>
                  </div>
                )}
              />
            )}
            <TabPaginationControls
              pagination={ratingsPagination}
              loading={ratingsQuery.isFetching}
              onPageChange={handleRatingsPageChange}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tables" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            {tablesQuery.isLoading && !tablesQuery.data ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                Loading tables...
              </div>
            ) : (tablesQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-center text-gray-500 py-8">No tables</p>
            ) : (
              <VirtualizedList
                items={tablesQuery.data?.items || []}
                itemHeight={110}
                renderItem={(table) => (
                  <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold">{table.name}</p>
                      <p className="text-xs text-gray-500">Created {new Date(table.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span>Capacity: {table.capacity}</span>
                      <Badge variant={
                        table.status === 'available' ? 'default' :
                        table.status === 'occupied' ? 'secondary' : 'outline'
                      }>
                        {table.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {table.currentReservationId ? `Reservation ${table.currentReservationId}` : 'No reservation'}
                      </span>
                    </div>
                  </div>
                )}
              />
            )}
            <TabPaginationControls
              pagination={tablesPagination}
              loading={tablesQuery.isFetching}
              onPageChange={handleTablesPageChange}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            {usersQuery.isLoading && !usersQuery.data ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mb-2"></div>
                Loading users...
              </div>
            ) : (usersQuery.data?.items.length ?? 0) === 0 ? (
              <p className="text-center text-gray-500 py-8">No users</p>
            ) : (
              <VirtualizedList
                items={usersQuery.data?.items || []}
                itemHeight={90}
                renderItem={(user) => (
                  <div className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(user.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              />
            )}
            <TabPaginationControls
              pagination={usersPagination}
              loading={usersQuery.isFetching}
              onPageChange={handleUsersPageChange}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  threshold?: number;
  renderItem: (item: T, index: number) => ReactNode;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

function VirtualizedList<T>({ items, itemHeight, threshold = 12, renderItem }: VirtualizedListProps<T>) {
  if (items.length <= threshold) {
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  const height = Math.min(items.length, threshold) * itemHeight;

  return (
    <FixedSizeList height={height} itemCount={items.length} itemSize={itemHeight} width="100%">
      {({ index, style }: { index: number; style: CSSProperties }) => (
        <div style={style}>
          {renderItem(items[index], index)}
        </div>
      )}
    </FixedSizeList>
  );
}

const clampPage = (nextPage: number, pagination: PaginationMeta) => {
  return Math.min(Math.max(nextPage, 1), Math.max(1, pagination.totalPages || 1));
};

function getPaginationFromQuery<T>(
  data: PaginatedResponse<T> | undefined,
  fallbackPage: number,
  fallbackLimit: number
): PaginationMeta {
  return {
    page: data?.pagination.page ?? fallbackPage,
    limit: data?.pagination.limit ?? fallbackLimit,
    total: data?.pagination.total ?? 0,
    totalPages: data?.pagination.totalPages ?? 1,
  };
}

interface TabPaginationControlsProps {
  pagination: PaginationMeta;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

function TabPaginationControls({ pagination, loading, onPageChange }: TabPaginationControlsProps) {
  const canGoPrev = pagination.page > 1;
  const canGoNext = pagination.page < pagination.totalPages;

  if (pagination.totalPages <= 1 && pagination.total <= pagination.limit) {
    return null;
  }

  const handlePrev = () => {
    if (!canGoPrev || loading) return;
    onPageChange(pagination.page - 1);
  };

  const handleNext = () => {
    if (!canGoNext || loading) return;
    onPageChange(pagination.page + 1);
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
      <div className="text-sm text-gray-600">
        Page {pagination.page} of {pagination.totalPages} • {pagination.total} items
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={!canGoPrev || !!loading}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={!canGoNext || !!loading}>
          Next
        </Button>
      </div>
    </div>
  );
}

