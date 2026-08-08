import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import { partsList } from '@/data/installationGuide';
import { InstallationV10PartsNotice } from '@/components/installation/InstallationV10Updates';

export function InstallationPartsTab() {
  return (
    <TabsContent value="parts" className="mt-4 space-y-4">
      <InstallationV10PartsNotice />
      {partsList.map((category, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{category.category}</span>
              <span className="text-xs text-muted-foreground font-normal">{category.categoryEn}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {category.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{item.name}</p>
                    {item.essential && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">আবশ্যক</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.nameEn}</p>
                  <p className="text-xs text-muted-foreground mt-1">🏪 {item.shop}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{item.price}</p>
                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Shop Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🛒 কোথায় কিনবেন?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: 'টেকশপ বিডি', url: 'https://techshopbd.com', note: 'ঢাকা, চট্টগ্রাম ডেলিভারি' },
            { name: 'রোবটিক্স বিডি', url: 'https://roboticsbd.com', note: 'সারাদেশে ডেলিভারি' },
            { name: 'বিডিস্টল', url: 'https://bdstall.com', note: 'মার্কেটপ্লেস' },
            { name: 'দারাজ', url: 'https://daraz.com.bd', note: 'অনলাইন শপিং' },
          ].map((shop, idx) => (
            <a
              key={idx}
              href={shop.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{shop.name}</p>
                <p className="text-xs text-muted-foreground">{shop.note}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
