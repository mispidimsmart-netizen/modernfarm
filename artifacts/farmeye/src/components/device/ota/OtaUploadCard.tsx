import { Upload, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFileSize, type useOtaManagement } from '@/hooks/useOtaManagement';

type Ota = ReturnType<typeof useOtaManagement>;

interface Props {
  language: string;
  form: Ota['form'];
  onUpload: () => void;
}

export function OtaUploadCard({ language, form, onUpload }: Props) {
  const { isUploading, uploadProgress, selectedFile } = form;

  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-5 w-5 text-green-500" />
          {language === 'bn' ? 'নতুন ফার্মওয়্যার আপলোড' : 'Upload New Firmware'}
        </CardTitle>
        <CardDescription>
          {language === 'bn'
            ? '.bin ফাইল আপলোড করুন ESP32 আপডেটের জন্য'
            : 'Upload .bin file for ESP32 OTA updates'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{language === 'bn' ? 'ফার্মওয়্যার ফাইল (.bin)' : 'Firmware File (.bin)'}</Label>
          <Input
            type="file"
            accept=".bin"
            onChange={(e) => form.setSelectedFile(e.target.files?.[0] || null)}
            disabled={isUploading}
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{language === 'bn' ? 'ভার্সন' : 'Version'}</Label>
          <Input
            placeholder="v1.2.0"
            value={form.version}
            onChange={(e) => form.setVersion(e.target.value)}
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2">
          <Label>{language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}</Label>
          <Select value={form.farmType} onValueChange={form.setFarmType} disabled={isUploading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'bn' ? 'সব ধরণ' : 'All Types'}</SelectItem>
              <SelectItem value="layer">{language === 'bn' ? 'লেয়ার' : 'Layer'}</SelectItem>
              <SelectItem value="broiler">{language === 'bn' ? 'ব্রয়লার' : 'Broiler'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'bn' ? 'রিলিজ নোট (English)' : 'Release Notes (English)'}</Label>
          <Textarea
            placeholder="What's new in this version..."
            value={form.releaseNotes}
            onChange={(e) => form.setReleaseNotes(e.target.value)}
            disabled={isUploading}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>{language === 'bn' ? 'রিলিজ নোট (বাংলা)' : 'Release Notes (Bangla)'}</Label>
          <Textarea
            placeholder="এই ভার্সনে নতুন কি আছে..."
            value={form.releaseNotesBn}
            onChange={(e) => form.setReleaseNotesBn(e.target.value)}
            disabled={isUploading}
            rows={2}
          />
        </div>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isStable}
            onChange={(e) => form.setIsStable(e.target.checked)}
            disabled={isUploading}
            className="h-4 w-4 rounded"
          />
          <div>
            <p className="font-medium text-sm">{language === 'bn' ? 'স্ট্যাবল রিলিজ' : 'Stable Release'}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'সব ডিভাইসে অটো-আপডেট হবে' : 'Auto-update for all devices'}
            </p>
          </div>
        </label>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{language === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        <Button className="w-full" onClick={onUpload} disabled={!selectedFile || !form.version || isUploading}>
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {language === 'bn' ? 'আপলোড করুন' : 'Upload Firmware'}
        </Button>
      </CardContent>
    </Card>
  );
}
