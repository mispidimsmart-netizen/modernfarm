import { ArrowLeft, MessageCircle, Users, ExternalLink, Phone, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * MVP community page — links farmers to existing channels (FB group, WhatsApp,
 * helpline). A native discussion module can replace this later (DB-backed
 * threads). Kept lightweight to ship Phase 8 without blocking on schema.
 */
export default function CommunityPage() {
  const navigate = useNavigate();

  const channels = [
    {
      title: 'WhatsApp খামারি গ্রুপ',
      desc: 'অন্য খামারিদের সাথে আলোচনা, প্রশ্ন-উত্তর',
      icon: MessageCircle,
      action: 'যোগ দিন',
      href: 'https://chat.whatsapp.com/',
      color: 'text-green-600',
    },
    {
      title: 'Facebook কমিউনিটি',
      desc: 'টিপস, রোগ নির্ণয়, বাজার দর',
      icon: Facebook,
      action: 'গ্রুপে যান',
      href: 'https://facebook.com/groups/',
      color: 'text-blue-600',
    },
    {
      title: 'হেল্পলাইন',
      desc: 'সরাসরি ভেট ও টেকনিকাল সাপোর্ট',
      icon: Phone,
      action: 'কল করুন',
      href: 'tel:+8801700000000',
      color: 'text-primary',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="পেছনে">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Users size={18} className="text-primary" /> খামারি কমিউনিটি
            </h1>
            <p className="text-xs text-muted-foreground">একসাথে শিখি, একসাথে এগোই</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-3">
        {channels.map((c) => (
          <Card key={c.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <c.icon className={c.color} size={20} />
                {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{c.desc}</p>
              <Button asChild variant="outline" className="w-full">
                <a href={c.href} target="_blank" rel="noopener noreferrer">
                  {c.action} <ExternalLink size={14} className="ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              শীঘ্রই — অ্যাপের ভেতরে সরাসরি প্রশ্ন-উত্তর ফোরাম
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
