import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { FileText, Upload, Trash2, ChevronDown, ChevronUp, FileImage, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  fetchRestaurantDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  type DocumentRef,
  type GroupedDocuments,
} from '../services/documentsApi';

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
  
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const menuInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [restaurantId, token]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await fetchRestaurantDocuments(restaurantId, token);
      setDocuments(data.documents);
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
                    <h5 className="text-lg font-semibold mb-3 capitalize" style={{ color: '#2D2D2B' }}>
                      {menuType} Menu
                    </h5>
                    
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
    </div>
  );
}

