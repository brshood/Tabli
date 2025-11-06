import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PersonalInformation } from './PersonalInformation';
import { RestaurantInformation } from './RestaurantInformation';
import { DocumentsManagement } from './DocumentsManagement';

interface RestaurantProfileProps {
  user: {
    name: string;
    email: string;
  };
  restaurantId: string;
  token: string;
  onUserUpdate: (user: any) => void;
}

export function RestaurantProfile({ user, restaurantId, token, onUserUpdate }: RestaurantProfileProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D2D2B' }}>Restaurant Profile</h2>
        <p style={{ color: '#5A5E3E' }}>Manage your personal information, restaurant details, and documents</p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="personal" style={{ color: 'var(--where2go-accent)' }}>
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="restaurant" style={{ color: 'var(--where2go-accent)' }}>
            Restaurant Info
          </TabsTrigger>
          <TabsTrigger value="documents" style={{ color: 'var(--where2go-accent)' }}>
            Files & Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInformation 
            user={user}
            token={token}
            onUserUpdate={onUserUpdate}
          />
        </TabsContent>

        <TabsContent value="restaurant">
          <RestaurantInformation 
            restaurantId={restaurantId}
            token={token}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsManagement 
            restaurantId={restaurantId}
            token={token}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

