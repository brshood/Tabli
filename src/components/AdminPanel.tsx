import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  loginAdmin, 
  getAllRestaurants, 
  getRestaurantDetails, 
  isAdminAuthenticated, 
  logoutAdmin,
  updateRestaurantApproval,
  deleteRestaurant as deleteRestaurantApi,
  type AdminRestaurant,
  type AdminRestaurantDetails
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
  Star,
  MessageCircle
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<AdminRestaurantDetails | null>(null);
  const [expandedRestaurantId, setExpandedRestaurantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setAuthenticated(true);
      loadRestaurants();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginAdmin(username, password);
      setAuthenticated(true);
      toast.success('Login successful');
      loadRestaurants();
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setAuthenticated(false);
    setRestaurants([]);
    setSelectedRestaurant(null);
    setExpandedRestaurantId(null);
    toast.success('Logged out');
  };

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const data = await getAllRestaurants();
      setRestaurants(data.restaurants);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load restaurants');
      if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/admin/feedback`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load feedback');
      }
      
      const data = await response.json();
      setFeedback(data.items || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load feedback');
      if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
        setAuthenticated(false);
      }
    } finally {
      setFeedbackLoading(false);
    }
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
    try {
      await updateRestaurantApproval(id, status, notes);
      toast.success(`Restaurant marked as ${status}.`);
      await loadRestaurants();
      if (expandedRestaurantId === id) {
        setLoadingDetails(id);
        try {
          const details = await getRestaurantDetails(id);
          setSelectedRestaurant(details);
        } finally {
          setLoadingDetails(null);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update approval status');
      throw error; // Re-throw so the button handler can catch it
    }
  };

  const handleDeleteRestaurant = async (id: string) => {
    const confirmed = window.confirm('This will permanently delete the restaurant, staff logins, reservations, and uploads. Continue?');
    if (!confirmed) return;
    try {
      await deleteRestaurantApi(id);
      toast.success('Restaurant deleted');
      await loadRestaurants();
      if (expandedRestaurantId === id) {
        setExpandedRestaurantId(null);
        setSelectedRestaurant(null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete restaurant');
      throw error; // Re-throw for button handler
    }
  };

  const loadRestaurantDetails = async (id: string) => {
    if (expandedRestaurantId === id && selectedRestaurant) {
      // Already loaded, just toggle
      setExpandedRestaurantId(null);
      setSelectedRestaurant(null);
      return;
    }

    setLoadingDetails(id);
    try {
      const details = await getRestaurantDetails(id);
      setSelectedRestaurant(details);
      setExpandedRestaurantId(id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load restaurant details');
    } finally {
      setLoadingDetails(null);
    }
  };

  const filteredRestaurants = restaurants.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(query) ||
      r.city.toLowerCase().includes(query) ||
      r.cuisine.toLowerCase().includes(query) ||
      r.email?.toLowerCase().includes(query) ||
      r.phone?.toLowerCase().includes(query)
    );
  });

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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
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
              <div className="flex gap-2">
                <Button 
                  onClick={() => { 
                    setFeedbackDialogOpen(true); 
                    loadFeedback(); 
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  View Feedback
                </Button>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-gray-600">
                Total: {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant List */}
        <div className="space-y-2">
          {loading && restaurants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading restaurants...</p>
              </CardContent>
            </Card>
          ) : filteredRestaurants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-600">
                No restaurants found
              </CardContent>
            </Card>
          ) : (
            filteredRestaurants.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden">
                <Collapsible
                  open={expandedRestaurantId === restaurant.id}
                  onOpenChange={() => loadRestaurantDetails(restaurant.id)}
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
                          {loadingDetails === restaurant.id ? (
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
                      {selectedRestaurant && selectedRestaurant.restaurant.id === restaurant.id ? (
                        <RestaurantDetails
                          details={selectedRestaurant}
                          getFileUrl={getFileUrl}
                          onApprovalChange={handleApprovalChange}
                          onDelete={handleDeleteRestaurant}
                        />
                      ) : (
                        <div className="p-4 text-center text-gray-500">Loading details...</div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
          </DialogHeader>
          
          {feedbackLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading feedback...</p>
            </div>
          ) : feedback.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No feedback submitted yet
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{item.restaurantName}</h3>
                        <p className="text-sm text-gray-500">
                          {item.customerName} • Party of {item.partySize} • {new Date(item.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">How did you hear about us?</span>
                        <p className="text-gray-700">{item.hearAboutUs}</p>
                      </div>
                      
                      {item.specialRequirements && (
                        <div>
                          <span className="font-medium">Special Requirements:</span>
                          <p className="text-gray-700">{item.specialRequirements}</p>
                        </div>
                      )}
                      
                      {item.improvements && (
                        <div>
                          <span className="font-medium">Suggestions for Improvement:</span>
                          <p className="text-gray-700">{item.improvements}</p>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Contact: {item.email || item.phone}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  onApprovalChange: (id: string, status: 'pending' | 'approved' | 'denied') => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const restaurant = details.restaurant;
  const [approvingStatus, setApprovingStatus] = useState<'approved' | 'pending' | 'denied' | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Group files by category
  const filesByCategory = {
    license: restaurant.mediaRefs?.filter(f => f.category === 'license') || [],
    menu: restaurant.mediaRefs?.filter(f => f.category === 'menu') || [],
    'profile-picture': restaurant.mediaRefs?.filter(f => f.category === 'profile-picture') || [],
    other: restaurant.mediaRefs?.filter(f => f.category === 'other') || [],
  };

  return (
    <Tabs defaultValue="basic" className="w-full">
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
          <CardContent className="p-6 space-y-4">
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={approvingStatus !== null}
                    onClick={async () => {
                      setApprovingStatus('approved');
                      try {
                        await onApprovalChange(restaurant.id, 'approved');
                      } finally {
                        setApprovingStatus(null);
                      }
                    }}
                  >
                    {approvingStatus === 'approved' ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Approving...
                      </>
                    ) : (
                      'Approve'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={approvingStatus !== null}
                    onClick={async () => {
                      setApprovingStatus('pending');
                      try {
                        await onApprovalChange(restaurant.id, 'pending');
                      } finally {
                        setApprovingStatus(null);
                      }
                    }}
                  >
                    {approvingStatus === 'pending' ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Updating...
                      </>
                    ) : (
                      'Mark pending'
                    )}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={approvingStatus !== null}
                    onClick={async () => {
                      setApprovingStatus('denied');
                      try {
                        await onApprovalChange(restaurant.id, 'denied');
                      } finally {
                        setApprovingStatus(null);
                      }
                    }}
                  >
                    {approvingStatus === 'denied' ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Denying...
                      </>
                    ) : (
                      'Deny'
                    )}
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
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={deleting}
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await onDelete(restaurant.id);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
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
          <CardContent className="p-6">
            {details.reservations.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reservations</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Party Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Confirmed</TableHead>
                      <TableHead>Seated</TableHead>
                      <TableHead>Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.reservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.name || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {reservation.email && (
                              <div className="text-xs">{reservation.email}</div>
                            )}
                            {reservation.phone && (
                              <div className="text-xs">{reservation.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{reservation.partySize}</TableCell>
                        <TableCell>
                          <Badge variant={
                            reservation.status === 'seated' ? 'default' :
                            reservation.status === 'confirmed' ? 'secondary' :
                            reservation.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {reservation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(reservation.requestedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {reservation.confirmedAt ? new Date(reservation.confirmedAt).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {reservation.seatedAt ? new Date(reservation.seatedAt).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {reservation.leftAt ? new Date(reservation.leftAt).toLocaleString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ratings" className="mt-4">
        <Card>
          <CardContent className="p-6">
            {details.ratings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No ratings</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rating</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.ratings.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {rating.value}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rating.showName && rating.name ? rating.name : 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rating.email && (
                              <div className="text-xs">{rating.email}</div>
                            )}
                            {rating.phone && (
                              <div className="text-xs">{rating.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm truncate">{rating.comment || 'N/A'}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(rating.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tables" className="mt-4">
        <Card>
          <CardContent className="p-6">
            {details.tables.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tables</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reservation ID</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.tables.map((table) => (
                      <TableRow key={table.id}>
                        <TableCell>{table.name}</TableCell>
                        <TableCell>{table.capacity}</TableCell>
                        <TableCell>
                          <Badge variant={
                            table.status === 'available' ? 'default' :
                            table.status === 'occupied' ? 'secondary' : 'outline'
                          }>
                            {table.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {table.currentReservationId || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(table.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users" className="mt-4">
        <Card>
          <CardContent className="p-6">
            {details.users.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No users</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(user.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

