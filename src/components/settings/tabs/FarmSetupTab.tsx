import { Baby, Cloud, Home, Wand2, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BirdAgeCard } from '@/components/farm/BirdAgeCard';
import { SEASONS, FARM_SIZES, PROFILES } from '@/data/farmSetupOptions';
import { useFarmSetupForm } from '@/hooks/useFarmSetupForm';
import { FarmTypeSection } from '@/components/settings/farm-setup/FarmTypeSection';
import { SeasonSection } from '@/components/settings/farm-setup/SeasonSection';
import { FarmSizeSection } from '@/components/settings/farm-setup/FarmSizeSection';
import { ProfileSection } from '@/components/settings/farm-setup/ProfileSection';
import { FarmSetupConfirmDialog } from '@/components/settings/farm-setup/FarmSetupConfirmDialog';

export function FarmSetupTab() {
  const f = useFarmSetupForm();
  const { language } = f;

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="space-y-3">
        {/* Farm Type Selection */}
        <AccordionItem value="farm-type" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Home className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'খামারের ধরণ' : 'Farm Type'}
              <Badge variant="secondary" className="ml-1 text-xs">
                {f.farmType === 'layer'
                  ? (language === 'bn' ? 'লেয়ার' : 'Layer')
                  : (language === 'bn' ? 'ব্রয়লার' : 'Broiler')}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <FarmTypeSection
              language={language}
              farmType={f.farmType}
              selectedShed={f.selectedShed}
              onChange={f.handleFarmTypeChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* 🐔 Unified Bird Age — single source of truth (broiler & layer) */}
        <AccordionItem value="bird-age" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Baby className="h-5 w-5 text-pink-500" />
              {language === 'bn' ? 'পাখির বয়স' : 'Bird Age'}
              <Badge variant="secondary" className="ml-1 text-xs">
                {f.hasAge
                  ? (f.farmType === 'layer'
                      ? `${f.unifiedAgeWeeks} ${language === 'bn' ? 'সপ্তাহ' : 'weeks'}`
                      : `${f.birdAge} ${language === 'bn' ? 'দিন' : 'days'}`)
                  : (language === 'bn' ? 'সেট করা হয়নি' : 'Not set')}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <BirdAgeCard />
          </AccordionContent>
        </AccordionItem>

        {/* Season Detection */}
        <AccordionItem value="season" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Cloud className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'মৌসুম' : 'Season'}
              <Badge variant="secondary" className="ml-1 text-xs">
                {SEASONS.find((s) => s.id === f.activeSeason)?.name[language]}
                {!f.isSeasonManual && ' • Auto'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <SeasonSection
              language={language}
              activeSeason={f.activeSeason}
              autoDetectedSeason={f.autoDetectedSeason}
              isSeasonManual={f.isSeasonManual}
              setIsSeasonManual={f.setIsSeasonManual}
              clearSeasonOverride={f.clearSeasonOverride}
              temperature={f.weatherData?.temperature}
              onChange={f.handleSeasonChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Farm Size */}
        <AccordionItem value="farm-size" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-base font-semibold">
              {language === 'bn' ? 'খামারের আকার' : 'Farm Size'}
              <Badge variant="secondary" className="ml-1 text-xs">
                {FARM_SIZES.find((s) => s.id === f.farmSize)?.name[language]}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <FarmSizeSection language={language} farmSize={f.farmSize} onChange={f.changeFarmSize} />
          </AccordionContent>
        </AccordionItem>

        {/* Profile Selection */}
        <AccordionItem value="profile" className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Wand2 className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'পরিচালনা প্রোফাইল' : 'Management Profile'}
              <Badge variant="secondary" className="ml-1 text-xs">
                {PROFILES.find((p) => p.id === f.activeProfile)?.name[language]}
                {!f.isProfileManual && ' • Auto'}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <ProfileSection
              language={language}
              activeProfile={f.activeProfile}
              autoDetectedProfile={f.autoDetectedProfile}
              isProfileManual={f.isProfileManual}
              setIsProfileManual={f.setIsProfileManual}
              clearProfileOverride={f.clearProfileOverride}
              birdAge={f.birdAge}
              onChange={f.handleProfileChange}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Apply Button */}
      <Button onClick={f.handleApplyClick} className="w-full h-14 text-lg" disabled={f.isApplying}>
        <Wand2 className="mr-2 h-5 w-5" />
        {language === 'bn' ? 'প্রস্তাবিত সেটিংস প্রয়োগ করুন' : 'Apply Recommended Settings'}
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>

      {/* Explanation */}
      <p className="text-center text-sm text-muted-foreground px-4">
        {language === 'bn'
          ? '💡 এটি আপনার নির্বাচন অনুযায়ী তাপমাত্রা, আর্দ্রতা এবং ভেন্টিলেশন সেটিংস স্বয়ংক্রিয়ভাবে সমন্বয় করবে।'
          : '💡 This will auto-adjust temperature, humidity, and ventilation settings based on your selections.'}
      </p>

      <FarmSetupConfirmDialog
        language={language}
        open={f.showConfirmDialog}
        onOpenChange={(open) => {
          f.setShowConfirmDialog(open);
          if (!open) f.setPendingChange(null);
        }}
        pendingChange={f.pendingChange}
        onConfirm={f.handleConfirmApply}
      />
    </div>
  );
}
