import { useState } from 'react';
import { ArrowLeft, PlayCircle, BookOpen, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Video = {
  id: string;
  title: string;
  description: string;
  category: 'broiler' | 'layer' | 'health' | 'farmeye' | 'biosecurity';
  durationMin: number;
  youtubeId: string;
};

// Curated Bengali poultry training videos.
// Replace youtubeId values with verified Bengali content as available.
const VIDEOS: Video[] = [
  { id: 'fe-1', title: 'FarmEye অ্যাপ পরিচিতি', description: 'প্রথমবার ব্যবহারের গাইড', category: 'farmeye', durationMin: 6, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'fe-2', title: 'অটোমেশন কিভাবে কাজ করে', description: 'ফ্যান, হিটার, কুলার অটো মোড', category: 'farmeye', durationMin: 8, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'br-1', title: 'ব্রয়লার বাচ্চা ব্রুডিং (০-৭ দিন)', description: 'তাপমাত্রা, পানি, খাবার', category: 'broiler', durationMin: 12, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'br-2', title: 'ব্রয়লার ফিড কনভার্শন', description: 'FCR ভালো রাখার উপায়', category: 'broiler', durationMin: 10, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'ly-1', title: 'লেয়ার মুরগির লাইটিং প্রোগ্রাম', description: 'ডিম উৎপাদন বাড়ানোর কৌশল', category: 'layer', durationMin: 9, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'ly-2', title: 'লেয়ার পিক প্রোডাকশন', description: 'প্রতিদিন ৯০%+ ডিম পেতে', category: 'layer', durationMin: 11, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'h-1', title: 'রানীক্ষেত রোগ চেনা ও প্রতিরোধ', description: 'লক্ষণ ও ভ্যাকসিন সিডিউল', category: 'health', durationMin: 14, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'h-2', title: 'হিট স্ট্রেস থেকে বাঁচানো', description: 'গরমে মৃত্যুহার কমান', category: 'health', durationMin: 7, youtubeId: 'dQw4w9WgXcQ' },
  { id: 'bs-1', title: 'বায়োসিকিউরিটি বেসিক', description: 'রোগ আসা থেকে আটকান', category: 'biosecurity', durationMin: 10, youtubeId: 'dQw4w9WgXcQ' },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'farmeye', label: 'FarmEye' },
  { value: 'broiler', label: 'ব্রয়লার' },
  { value: 'layer', label: 'লেয়ার' },
  { value: 'health', label: 'স্বাস্থ্য' },
  { value: 'biosecurity', label: 'বায়োসিকিউরিটি' },
];

export default function TrainingVideosPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>('all');
  const [playing, setPlaying] = useState<Video | null>(null);

  const filtered = active === 'all' ? VIDEOS : VIDEOS.filter((v) => v.category === active);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="পেছনে">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <BookOpen size={18} className="text-primary" /> ট্রেনিং ভিডিও
            </h1>
            <p className="text-xs text-muted-foreground">বাংলায় পোলট্রি শেখা</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-3xl mx-auto">
        {playing && (
          <Card className="mb-4 overflow-hidden">
            <div className="aspect-video bg-black">
              <iframe
                title={playing.title}
                src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1`}
                className="h-full w-full"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <CardContent className="p-3">
              <h2 className="font-semibold">{playing.title}</h2>
              <p className="text-sm text-muted-foreground">{playing.description}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setPlaying(null)}>
                বন্ধ করুন
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={active} onValueChange={setActive} className="mb-4">
          <TabsList className="w-full overflow-x-auto justify-start">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => setPlaying(v)}
              className="group text-left rounded-xl border bg-card overflow-hidden hover:border-primary/50 transition"
            >
              <div className="relative aspect-video bg-muted">
                <img
                  src={`https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg`}
                  alt={v.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                  <PlayCircle className="h-12 w-12 text-white drop-shadow" />
                </div>
                <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                  {v.durationMin} মিনিট
                </Badge>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm leading-snug">{v.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="mx-auto mb-2" />
            কোনো ভিডিও নেই
          </div>
        )}
      </main>
    </div>
  );
}
