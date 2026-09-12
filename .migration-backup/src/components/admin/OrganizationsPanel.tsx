import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Org, MemberRow } from './organizations/types';
import { EditOrgDialog } from './organizations/OrgCreateEditDialogs';
import { EditMemberRoleDialog } from './organizations/OrgLicenseMemberDialogs';
import { AddFarmToOrgDialog } from './organizations/AddFarmToOrgDialog';
import { OrgListCard } from './organizations/OrgListCard';
import { OrgMembersCard } from './organizations/OrgMembersCard';
import { DeleteOrgConfirm, RemoveMemberConfirm, RemoveFarmConfirm } from './organizations/OrgConfirmDialogs';
import { useOrganizationsAdmin } from '@/hooks/useOrganizationsAdmin';

export function OrganizationsPanel() {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [deleteOrgTarget, setDeleteOrgTarget] = useState<Org | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<MemberRow | null>(null);
  const [editMemberTarget, setEditMemberTarget] = useState<MemberRow | null>(null);
  const [addFarmOpen, setAddFarmOpen] = useState(false);
  const [confirmRemoveFarm, setConfirmRemoveFarm] = useState<{ id: string; name: string } | null>(null);

  const {
    qc, orgs, isLoading, members, orgFarms, farmsLoading, ownerMap,
    deleteOrg, deleteOrgCounts, removeMember, setRole, reassignFarm, removeFarmFromOrg,
  } = useOrganizationsAdmin({
    selectedOrgId,
    deleteOrgTargetId: deleteOrgTarget?.id ?? null,
    onOrgDeleted: (org_id) => {
      if (selectedOrgId === org_id) setSelectedOrgId(null);
      setDeleteOrgTarget(null);
    },
    onFarmRemoved: () => setConfirmRemoveFarm(null),
  });

  const selectedOrg = orgs.find(o => o.id === selectedOrgId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <OrgListCard
        orgs={orgs}
        isLoading={isLoading}
        selectedOrgId={selectedOrgId}
        createOpen={createOpen}
        setCreateOpen={setCreateOpen}
        onSelect={setSelectedOrgId}
        onEdit={setEditOrg}
        onDelete={setDeleteOrgTarget}
        onCreated={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ['admin_organizations'] });
        }}
      />

      <OrgMembersCard
        orgs={orgs}
        selectedOrg={selectedOrg}
        selectedOrgId={selectedOrgId}
        members={members}
        orgFarms={orgFarms}
        farmsLoading={farmsLoading}
        ownerMap={ownerMap}
        licenseOpen={licenseOpen}
        setLicenseOpen={setLicenseOpen}
        addMemberOpen={addMemberOpen}
        setAddMemberOpen={setAddMemberOpen}
        onLicenseSaved={() => {
          setLicenseOpen(false);
          qc.invalidateQueries({ queryKey: ['admin_organizations'] });
        }}
        onMemberAdded={() => {
          setAddMemberOpen(false);
          qc.invalidateQueries({ queryKey: ['admin_org_members', selectedOrgId] });
        }}
        onEditMember={setEditMemberTarget}
        onRemoveMember={setRemoveMemberTarget}
        onAddFarm={() => setAddFarmOpen(true)}
        onReassignFarm={(farmId, newOrgId) => reassignFarm.mutate({ farmId, newOrgId })}
        onRemoveFarm={setConfirmRemoveFarm}
      />

      {/* Edit org dialog */}
      <Dialog open={!!editOrg} onOpenChange={(o) => !o && setEditOrg(null)}>
        {editOrg && (
          <EditOrgDialog
            org={editOrg}
            onSaved={() => {
              setEditOrg(null);
              qc.invalidateQueries({ queryKey: ['admin_organizations'] });
            }}
          />
        )}
      </Dialog>

      <DeleteOrgConfirm
        target={deleteOrgTarget}
        counts={deleteOrgCounts}
        isPending={deleteOrg.isPending}
        onOpenChange={(o) => !o && !deleteOrg.isPending && setDeleteOrgTarget(null)}
        onConfirm={() => { if (deleteOrgTarget) deleteOrg.mutate(deleteOrgTarget.id); }}
      />

      {/* Edit member role */}
      <Dialog
        open={!!editMemberTarget}
        onOpenChange={(o) => !o && !setRole.isPending && setEditMemberTarget(null)}
      >
        {editMemberTarget && (
          <EditMemberRoleDialog
            member={editMemberTarget}
            isPending={setRole.isPending}
            onSave={(role) => {
              setRole.mutate(
                { user_id: editMemberTarget.user_id, role },
                { onSuccess: () => setEditMemberTarget(null) },
              );
            }}
            onClose={() => setEditMemberTarget(null)}
          />
        )}
      </Dialog>

      <RemoveMemberConfirm
        target={removeMemberTarget}
        isPending={removeMember.isPending}
        onOpenChange={(o) => !o && !removeMember.isPending && setRemoveMemberTarget(null)}
        onConfirm={() => {
          if (removeMemberTarget) {
            removeMember.mutate(
              { user_id: removeMemberTarget.user_id },
              { onSettled: () => setRemoveMemberTarget(null) },
            );
          }
        }}
      />

      {/* Add existing farm to this org */}
      {selectedOrgId && (
        <Dialog open={addFarmOpen} onOpenChange={setAddFarmOpen}>
          <AddFarmToOrgDialog
            orgId={selectedOrgId}
            currentOrgName={selectedOrg?.name || ''}
            onAssigned={(farmId) => {
              reassignFarm.mutate(
                { farmId, newOrgId: selectedOrgId },
                { onSuccess: () => setAddFarmOpen(false) },
              );
            }}
            isPending={reassignFarm.isPending}
          />
        </Dialog>
      )}

      <RemoveFarmConfirm
        target={confirmRemoveFarm}
        isPending={removeFarmFromOrg.isPending}
        onOpenChange={(o) => !o && !removeFarmFromOrg.isPending && setConfirmRemoveFarm(null)}
        onConfirm={() => { if (confirmRemoveFarm) removeFarmFromOrg.mutate(confirmRemoveFarm.id); }}
      />
    </div>
  );
}
