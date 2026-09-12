import { useOtaManagement } from '@/hooks/useOtaManagement';
import { OtaUploadCard } from './ota/OtaUploadCard';
import { OtaFirmwareListCard } from './ota/OtaFirmwareListCard';
import { OtaDeviceStatusCard } from './ota/OtaDeviceStatusCard';
import { OtaDialogs } from './ota/OtaDialogs';

export function OTAManagementCard() {
  const ota = useOtaManagement();
  const { dialogs } = ota;

  return (
    <div className="space-y-4">
      <OtaUploadCard
        language={ota.language}
        form={ota.form}
        onUpload={() => ota.uploadFirmware.mutate()}
      />

      <OtaFirmwareListCard
        language={ota.language}
        isLoading={ota.isLoading}
        firmwares={ota.firmwares}
        formatDate={ota.formatDate}
        onPush={(fw) => {
          dialogs.setSelectedFirmwareForPush(fw);
          dialogs.setPushDialogOpen(true);
        }}
        onDelete={(id) => {
          dialogs.setFirmwareToDelete(id);
          dialogs.setDeleteDialogOpen(true);
        }}
      />

      {ota.deviceTokens && ota.deviceTokens.length > 0 && (
        <OtaDeviceStatusCard
          language={ota.language}
          deviceTokens={ota.deviceTokens}
          getDeviceOtaStatus={ota.getDeviceOtaStatus}
        />
      )}

      <OtaDialogs
        language={ota.language}
        deleteOpen={dialogs.deleteDialogOpen}
        onDeleteOpenChange={dialogs.setDeleteDialogOpen}
        onConfirmDelete={() =>
          dialogs.firmwareToDelete && ota.deleteFirmware.mutate(dialogs.firmwareToDelete)
        }
        pushOpen={dialogs.pushDialogOpen}
        onPushOpenChange={dialogs.setPushDialogOpen}
        selectedFirmware={dialogs.selectedFirmwareForPush}
        deviceTokens={ota.deviceTokens}
        selectedDevice={dialogs.selectedDeviceForPush}
        setSelectedDevice={dialogs.setSelectedDeviceForPush}
        onConfirmPush={() => {
          if (dialogs.selectedFirmwareForPush && dialogs.selectedDeviceForPush) {
            ota.pushUpdate.mutate({
              deviceTokenId: dialogs.selectedDeviceForPush,
              firmwareId: dialogs.selectedFirmwareForPush.id,
            });
          }
        }}
        isPushing={ota.pushUpdate.isPending}
      />
    </div>
  );
}
