import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { FileText, Upload, Trash2, ChevronDown, ChevronUp, FileImage, Eye, Plus, Edit2, Camera } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  fetchRestaurantDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  type DocumentRef,
  type GroupedDocuments,
} from '../services/documentsApi';
import { updateMenuType, uploadProfilePicture, deleteProfilePicture, getProfilePictureUrl, getRestaurantInfo } from '../services/profileApi';

interface DocumentsManagementProps {
  restaurantId: string;
  token: string;
}

export function DocumentsManagement({ restaurantId, token }: DocumentsManagementProps) {
  const [documents, setDocuments] = useState<GroupedDocuments>({ license: [], menus: {}, other: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [menuTypeModalOpen, setMenuTypeModalOpen] = useState(false);
  const [menuType, setMenuType] = useState('');
  const [pendingMenuFile, setPendingMenuFile] = useState<File | null>(null);
  
  const [editMenuTypeModalOpen, setEditMenuTypeModalOpen] = useState(false);
  const [editingMenuType, setEditingMenuType] = useState('');
  const [editingFileId, setEditingFileId] = useState('');
  const [newMenuTypeName, setNewMenuTypeName] = useState('');
  
  const [profilePictureId, setProfilePictureId] = useState<string | null>(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const menuInputRef = useRef<HTMLInputElement>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [restaurantId, token]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchRestaurantDocuments(restaurantId, token);
      setDocuments(data.documents);
      
      // Find active profile picture in the 'all' documents array
      const allDocs = data.all || [];
      const profilePic = allDocs.find(
        doc => doc.category === 'profile-picture' && doc.isActive
      );
      setProfilePictureId(profilePic?.fileId?.toString() || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    category: 'license' | 'menu',
    menuType?: string
  ) => {
    try {
      setUploading(true);
      await uploadDocument(restaurantId, file, category, menuType, token);
      toast.success(`${category === 'license' ? 'License' : 'Menu'} uploaded successfully!`);
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleLicenseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, JPG, or PNG.');
      return;
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    await handleFileUpload(file, 'license');
    if (licenseInputRef.current) licenseInputRef.current.value = '';
  };

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, JPG, or PNG.');
      return;
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    // Open modal to get menu type
    setPendingMenuFile(file);
    setMenuTypeModalOpen(true);
    if (menuInputRef.current) menuInputRef.current.value = '';
  };

  const handleMenuTypeSubmit = async () => {
    if (!menuType.trim()) {
      toast.error('Menu type is required.');
      return;
    }

    if (!pendingMenuFile) return;

    setMenuTypeModalOpen(false);
    await handleFileUpload(pendingMenuFile, 'menu', menuType.trim().toLowerCase());
    
    // Reset state
    setMenuType('');
    setPendingMenuFile(null);
  };

  const handleMenuTypeCancel = () => {
    setMenuTypeModalOpen(false);
    setMenuType('');
    setPendingMenuFile(null);
  };

  const handleEditMenuType = (menuType: string, fileId: string) => {
    setEditingMenuType(menuType);
    setEditingFileId(fileId);
    setNewMenuTypeName(menuType);
    setEditMenuTypeModalOpen(true);
  };

  const handleSaveMenuType = async () => {
    if (!newMenuTypeName.trim()) {
      toast.error('Menu type is required.');
      return;
    }

    try {
      await updateMenuType(restaurantId, editingFileId, newMenuTypeName.trim().toLowerCase(), token);
      toast.success('Menu type updated successfully!');
      setEditMenuTypeModalOpen(false);
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update menu type');
    }
  };

  const handleCancelEditMenuType = () => {
    setEditMenuTypeModalOpen(false);
    setEditingMenuType('');
    setEditingFileId('');
    setNewMenuTypeName('');
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPEG, PNG, WebP) are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingProfilePicture(true);
      const result = await uploadProfilePicture(restaurantId, file, token);
      toast.success('Profile picture uploaded successfully!');
      // Reload documents to get the new profile picture
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingProfilePicture(false);
      if (profilePictureInputRef.current) {
        profilePictureInputRef.current.value = '';
      }
    }
  };

  const handleDeleteProfilePicture = async () => {
    const confirmed = confirm('Are you sure you want to delete your profile picture?');
    if (!confirmed) return;

    try {
      setUploadingProfilePicture(true);
      await deleteProfilePicture(restaurantId, token);
      toast.success('Profile picture deleted successfully');
      // Reload documents to update the state
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete profile picture');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    const confirmed = confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDocument(restaurantId, fileId, token);
      toast.success('Document deleted successfully');
      await loadDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const toggleHistory = (key: string) => {
    setExpandedHistory(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (doc: DocumentRef) => {
    if (doc.type === 'pdf') {
      return <FileText className="h-5 w-5" style={{ color: '#B7410E' }} />;
    }
    return <FileImage className="h-5 w-5" style={{ color: '#B7410E' }} />;
  };

  const renderDocumentCard = (doc: DocumentRef, showCategory: boolean = false) => (
    <div
      key={doc.fileId.toString()}
      className="rounded-2xl p-4 border"
      style={{ backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E7D7C5' }}
          >
            {getFileIcon(doc)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate" style={{ color: '#2D2D2B' }}>
                {doc.filename}
              </h4>
              {doc.isActive && (
                <Badge className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#5A5E3E', color: '#FFFFFF' }}>
                  Current
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-sm" style={{ color: '#2D2D2B' }}>
              {showCategory && (
                <span className="capitalize">{doc.category}</span>
              )}
              {doc.menuType && (
                <span className="capitalize">• {doc.menuType}</span>
              )}
              <span>• Version {doc.version}</span>
              <span>• {formatDate(doc.uploadedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(getDocumentDownloadUrl(doc.fileId.toString()), '_blank')}
            className="pill-button text-xs h-8 w-8 p-0"
            style={{ borderColor: '#5A5E3E', color: '#5A5E3E' }}
            title="View document"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(doc.fileId.toString(), doc.filename)}
            className="pill-button text-xs h-8 w-8 p-0"
            style={{ borderColor: '#D77A61', color: '#D77A61' }}
            title="Delete document"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#B7410E' }}></div>
          <p style={{ color: '#2D2D2B' }}>Loading documents...</p>
        </div>
      </div>
    );
  }

  const activeLicense = documents.license.find(doc => doc.isActive);
  const licenseHistory = documents.license.filter(doc => !doc.isActive).sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-8">
      {/* Profile Picture Card */}
      <Card className="card-shadow border-0 rounded-3xl overflow-hidden">
        <CardHeader style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)' }}>
          <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
            <Camera className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
            Restaurant Profile Picture
          </CardTitle>
          <p className="text-sm mt-2" style={{ color: '#5A5E3E' }}>
            This picture will represent your restaurant across the platform
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Picture Display */}
            <div className="flex-shrink-0">
              {profilePictureId ? (
                <div className="relative group">
                  <div className="relative w-40 h-40 rounded-2xl overflow-hidden shadow-lg">
                    <img
                      src={getProfilePictureUrl(profilePictureId)}
                      alt="Restaurant Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load');
                        e.currentTarget.src = '';
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteProfilePicture}
                      disabled={uploadingProfilePicture}
                      className="opacity-0 group-hover:opacity-100 transition-opacity pill-button shadow-lg"
                      style={{ borderColor: '#B7410E', color: '#B7410E', backgroundColor: 'white' }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-40 h-40 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed shadow-inner"
                  style={{ borderColor: '#5A5E3E', backgroundColor: '#F9FAFB' }}
                >
                  <Camera className="h-12 w-12 mb-2" style={{ color: '#9FA0A0' }} />
                  <p className="text-xs text-center px-4" style={{ color: '#9FA0A0' }}>
                    No photo yet
                  </p>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="font-semibold mb-2" style={{ color: '#2D2D2B' }}>
                  Upload Guidelines
                </h4>
                <ul className="text-sm space-y-1" style={{ color: '#5A5E3E' }}>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Use a high-quality image (at least 400x400px)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Square images work best</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Supported formats: JPEG, PNG, WebP</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Maximum file size: 5MB</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <input
                  ref={profilePictureInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={uploadingProfilePicture}
                />
                <Button
                  onClick={() => profilePictureInputRef.current?.click()}
                  disabled={uploadingProfilePicture}
                  className="pill-button text-white shadow-md hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: '#3F4427' }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingProfilePicture ? 'Uploading...' : profilePictureId ? 'Change Picture' : 'Upload Picture'}
                </Button>
                
                {profilePictureId && !uploadingProfilePicture && (
                  <Button
                    variant="outline"
                    onClick={handleDeleteProfilePicture}
                    className="pill-button"
                    style={{ borderColor: '#B7410E', color: '#B7410E' }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Picture
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    <div className="space-y-8">
      {/* Business License Section */}
      <Card className="card-shadow border-0 rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
              <FileText className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
              Business License
            </CardTitle>
            <div>
              <input
                ref={licenseInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleLicenseUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                onClick={() => licenseInputRef.current?.click()}
                disabled={uploading}
                className="pill-button text-white"
                style={{ backgroundColor: '#3F4427' }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {activeLicense ? 'Replace License' : 'Upload License'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {activeLicense ? (
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium uppercase tracking-wide mb-3" style={{ color: '#2D2D2B' }}>
                  Current License
                </h5>
                {renderDocumentCard(activeLicense)}
              </div>

              {licenseHistory.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleHistory('license')}
                    className="flex items-center gap-2 text-sm font-medium mb-3 hover:opacity-70 transition-opacity"
                    style={{ color: '#5A5E3E' }}
                  >
                    {expandedHistory['license'] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Version History ({licenseHistory.length})
                  </button>
                  {expandedHistory['license'] && (
                    <div className="space-y-3 pl-4">
                      {licenseHistory.map(doc => renderDocumentCard(doc))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#9FA0A0' }}>
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No business license uploaded yet</p>
              <p className="text-sm mt-1">Upload your business license to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menus Section */}
      <Card className="card-shadow border-0 rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
              <FileText className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
              Restaurant Menus
            </CardTitle>
            <div>
              <input
                ref={menuInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleMenuUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                onClick={() => menuInputRef.current?.click()}
                disabled={uploading}
                className="pill-button text-white"
                style={{ backgroundColor: '#3F4427' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Menu
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {Object.keys(documents.menus).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(documents.menus).map(([menuType, menus]) => {
                const activeMenu = menus.find(m => m.isActive);
                const menuHistory = menus.filter(m => !m.isActive).sort((a, b) => b.version - a.version);

                return (
                  <div key={menuType} className="border-b pb-6 last:border-b-0 last:pb-0" style={{ borderColor: 'rgba(183, 65, 14, 0.2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-lg font-semibold capitalize" style={{ color: '#2D2D2B' }}>
                        {menuType} Menu
                      </h5>
                      {activeMenu && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditMenuType(menuType, activeMenu.fileId.toString())}
                          className="pill-button text-xs"
                          style={{ borderColor: '#5A5E3E', color: '#5A5E3E' }}
                          title="Edit menu type"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit Type
                        </Button>
                      )}
                    </div>
                    
                    {activeMenu && (
                      <div className="mb-4">
                        <p className="text-sm font-medium uppercase tracking-wide mb-2" style={{ color: '#2D2D2B' }}>
                          Current Version
                        </p>
                        {renderDocumentCard(activeMenu)}
                      </div>
                    )}

                    {menuHistory.length > 0 && (
                      <div>
                        <button
                          onClick={() => toggleHistory(`menu-${menuType}`)}
                          className="flex items-center gap-2 text-sm font-medium mb-3 hover:opacity-70 transition-opacity"
                          style={{ color: '#5A5E3E' }}
                        >
                          {expandedHistory[`menu-${menuType}`] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          Version History ({menuHistory.length})
                        </button>
                        {expandedHistory[`menu-${menuType}`] && (
                          <div className="space-y-3 pl-4">
                            {menuHistory.map(doc => renderDocumentCard(doc))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#9FA0A0' }}>
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No menus uploaded yet</p>
              <p className="text-sm mt-1">Upload your restaurant menus (lunch, dinner, drinks, etc.)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Instructions */}
      <Card className="card-shadow border-0 rounded-2xl" style={{ backgroundColor: '#F0DC82', opacity: 0.9 }}>
        <CardContent className="p-4">
          <p className="text-sm" style={{ color: '#2D2D2B' }}>
            <strong>Note:</strong> Supported file formats: PDF, JPG, PNG. Maximum file size: 25MB. 
            All document versions are preserved for your records. When you upload a new version, 
            the previous version will be archived but remains accessible in the version history.
          </p>
        </CardContent>
      </Card>

      {/* Menu Type Modal */}
      <Dialog open={menuTypeModalOpen} onOpenChange={setMenuTypeModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#F3F4F6', borderColor: 'rgba(60, 60, 60, 0.2)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#2D2D2B' }}>Enter Menu Type</DialogTitle>
            <DialogDescription style={{ color: '#5A5E3E' }}>
              Enter menu type (e.g., lunch, dinner, drinks, desserts):
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="menuType" style={{ color: '#2D2D2B' }}>Menu Type</Label>
              <Input
                id="menuType"
                value={menuType}
                onChange={(e) => setMenuType(e.target.value)}
                placeholder="e.g., lunch, dinner, drinks"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleMenuTypeSubmit();
                  }
                }}
                autoFocus
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleMenuTypeCancel}
              className="pill-button"
              style={{ borderColor: '#5A5E3E', color: '#5A5E3E' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMenuTypeSubmit}
              disabled={!menuType.trim()}
              className="pill-button text-white"
              style={{ backgroundColor: '#3F4427' }}
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Type Modal */}
      <Dialog open={editMenuTypeModalOpen} onOpenChange={setEditMenuTypeModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#F3F4F6', borderColor: 'rgba(60, 60, 60, 0.2)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#2D2D2B' }}>Edit Menu Type</DialogTitle>
            <DialogDescription style={{ color: '#5A5E3E' }}>
              Update the menu type name (e.g., lunch, dinner, drinks):
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newMenuType" style={{ color: '#2D2D2B' }}>Menu Type</Label>
              <Input
                id="newMenuType"
                value={newMenuTypeName}
                onChange={(e) => setNewMenuTypeName(e.target.value)}
                placeholder="e.g., lunch, dinner, drinks"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveMenuType();
                  }
                }}
                autoFocus
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleCancelEditMenuType}
              className="pill-button"
              style={{ borderColor: '#5A5E3E', color: '#5A5E3E' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMenuType}
              disabled={!newMenuTypeName.trim()}
              className="pill-button text-white"
              style={{ backgroundColor: '#3F4427' }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}

