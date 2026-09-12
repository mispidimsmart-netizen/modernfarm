import { motion } from 'framer-motion';
import { Download, Trash2, Loader2, Send, HardDrive, FileCode, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatFileSize, type Firmware } from '@/hooks/useOtaManagement';

interface Props {
  language: string;
  isLoading: boolean;
  firmwares?: Firmware[];
  formatDate: (d: string) => string;
  onPush: (fw: Firmware) => void;
  onDelete: (id: string) => void;
}

export function OtaFirmwareListCard({ language, isLoading, firmwares, formatDate, onPush, onDelete }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'আপলোড করা ফার্মওয়্যার' : 'Uploaded Firmwares'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : firmwares && firmwares.length > 0 ? (
          <div className="space-y-3">
            {firmwares.map((firmware) => (
              <motion.div
                key={firmware.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-primary" />
                    <span className="font-medium">{firmware.version}</span>
                    {firmware.is_stable && (
                      <Badge variant="default" className="text-xs">
                        {language === 'bn' ? 'স্ট্যাবল' : 'Stable'}
                      </Badge>
                    )}
                    {firmware.farm_type !== 'all' && (
                      <Badge variant="outline" className="text-xs">
                        {firmware.farm_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPush(firmware)}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDelete(firmware.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {formatFileSize(firmware.file_size_bytes || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(firmware.created_at)}
                  </span>
                </div>
                {(firmware.release_notes || firmware.release_notes_bn) && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? firmware.release_notes_bn : firmware.release_notes}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{language === 'bn' ? 'কোনো ফার্মওয়্যার নেই' : 'No firmware uploaded'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
