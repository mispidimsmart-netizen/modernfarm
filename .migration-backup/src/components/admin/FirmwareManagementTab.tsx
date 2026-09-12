import { SigningKeysCard } from "./SigningKeysCard";
import { useFirmwareRegistry } from "@/hooks/useFirmwareRegistry";
import { FirmwareBuildGuide } from "./firmware/FirmwareBuildGuide";
import { FirmwareUploadForm } from "./firmware/FirmwareUploadForm";
import { FirmwareRegistryList } from "./firmware/FirmwareRegistryList";

interface Props {
  language: "bn" | "en";
}

export function FirmwareManagementTab({ language }: Props) {
  const t = (bn: string, en: string) => (language === "bn" ? bn : en);
  const { signingKeys, firmwares, isLoading, toggleActive, uploadFirmware, uploading } =
    useFirmwareRegistry(t);

  return (
    <div className="space-y-6">
      <FirmwareBuildGuide t={t} />

      <SigningKeysCard language={language} />

      <FirmwareUploadForm
        t={t}
        signingKeys={signingKeys}
        uploading={uploading}
        onUpload={uploadFirmware}
      />

      <FirmwareRegistryList
        t={t}
        firmwares={firmwares}
        isLoading={isLoading}
        onToggleActive={(args) => toggleActive.mutate(args)}
      />
    </div>
  );
}
