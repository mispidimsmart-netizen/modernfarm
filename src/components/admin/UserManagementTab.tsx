import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Crown, Building2, Tractor, HardHat } from 'lucide-react';
import { AdminManagementTab } from './AdminManagementTab';
import { OrganizationsPanel } from './OrganizationsPanel';
import { FarmsAdminPanel } from './FarmsAdminPanel';
import { WorkersAdminPanel } from './WorkersAdminPanel';

interface Props { language: 'bn' | 'en'; }

export function UserManagementTab({ language }: Props) {
  return (
    <Tabs defaultValue="admins" className="w-full">
      <TabsList className="bg-slate-900/80 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1.5 rounded-xl shadow-lg h-auto w-full">
        <TabsTrigger
          value="admins"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-white rounded-lg"
        >
          <Crown className="w-4 h-4 mr-2" />
          অ্যাডমিন
        </TabsTrigger>
        <TabsTrigger
          value="orgs"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-white rounded-lg"
        >
          <Building2 className="w-4 h-4 mr-2" />
          অর্গানাইজেশন
        </TabsTrigger>
        <TabsTrigger
          value="farms"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-white rounded-lg"
        >
          <Tractor className="w-4 h-4 mr-2" />
          ফার্ম
        </TabsTrigger>
        <TabsTrigger
          value="workers"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-slate-400 hover:text-white rounded-lg"
        >
          <HardHat className="w-4 h-4 mr-2" />
          ওয়ার্কার
        </TabsTrigger>
      </TabsList>

      <TabsContent value="admins" className="mt-4">
        <AdminManagementTab language={language} />
      </TabsContent>
      <TabsContent value="orgs" className="mt-4">
        <OrganizationsPanel />
      </TabsContent>
      <TabsContent value="farms" className="mt-4">
        <FarmsAdminPanel />
      </TabsContent>
      <TabsContent value="workers" className="mt-4">
        <WorkersAdminPanel />
      </TabsContent>
    </Tabs>
  );
}
