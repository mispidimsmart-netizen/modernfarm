import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Cpu, Wifi, Code2, FileCode, ExternalLink } from "lucide-react";

const API_BASE_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";

export function ApiDocsPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CodeBlock = ({ code, language = "json", section }: { code: string; language?: string; section: string }) => (
    <div className="relative">
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(code, section)}
      >
        {copiedSection === section ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              দ্রুত শুরু করুন
            </CardTitle>
            <CardDescription>
              ESP32 দিয়ে স্মার্ট ফার্ম সিস্টেমে সেন্সর ডাটা পাঠান
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">ডিভাইস তৈরি করুন</h4>
                  <p className="text-sm text-muted-foreground">Settings পেজে নতুন ডিভাইস যোগ করুন</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Device ID কপি করুন</h4>
                  <p className="text-sm text-muted-foreground">ডিভাইস নাম Arduino কোডে পেস্ট করুন</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg border">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">কোড আপলোড করুন</h4>
                  <p className="text-sm text-muted-foreground">ESP32-তে কোড আপলোড করুন</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button asChild>
                <a href="/esp32-code.ino" download className="gap-2">
                  <FileCode className="h-4 w-4" />
                  Arduino কোড ডাউনলোড করুন
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              API Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sensor-data" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                <TabsTrigger value="sensor-data">সেন্সর ডাটা</TabsTrigger>
                <TabsTrigger value="device-status">ডিভাইস স্ট্যাটাস</TabsTrigger>
                <TabsTrigger value="commands">কমান্ড</TabsTrigger>
                <TabsTrigger value="settings">সেটিংস</TabsTrigger>
                <TabsTrigger value="automation">অটোমেশন</TabsTrigger>
              </TabsList>

              <TabsContent value="sensor-data" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">POST</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/data</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  সেন্সর রিডিং পাঠাতে এই endpoint ব্যবহার করুন। প্রতি ৩০ সেকেন্ডে একবার পাঠান।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Request Body:</h4>
                  <CodeBlock
                    section="sensor-request"
                    language="json"
                    code={`{
  "device_id": "ESP32_LAYER_001",
  "temperature": 28.5,
  "humidity": 65.0,
  "ammonia": 12.5,
  "water_flow": 45.2,
  "power_status": "ON"
}`}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Response:</h4>
                  <CodeBlock
                    section="sensor-response"
                    language="json"
                    code={`{
  "success": true,
  "message": "Sensor data saved",
  "alerts_created": 0,
  "hsi": 35.0,
  "hsi_level": "MILD"
}`}
                  />
                </div>

                <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">গুরুত্বপূর্ণ</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    temperature, humidity, ammonia সব সংখ্যা হতে হবে। HSI অটো ক্যালকুলেট হবে (Temp + Humidity × 0.1)।
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="device-status" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500">POST</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/device-status</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  ডিভাইসের on/off স্ট্যাটাস আপডেট করতে এই endpoint ব্যবহার করুন।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Request Body:</h4>
                  <CodeBlock
                    section="status-request"
                    language="json"
                    code={`{
  "device_id": "ESP32_LAYER_001",
  "power_on": true,
  "fan_on": true,
  "light_on": false,
  "alarm_on": false
}`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="commands" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">GET</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/commands?device_id=ESP32_LAYER_001</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  পেন্ডিং কমান্ড পেতে। ESP32 প্রতি ৫ সেকেন্ডে এই endpoint পোল করবে।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Response:</h4>
                  <CodeBlock
                    section="commands-response"
                    language="json"
                    code={`{
  "success": true,
  "commands": [
    {
      "id": "uuid-here",
      "command_type": "fan",
      "command_value": true,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "device_id": "ESP32_LAYER_001",
  "timestamp": "2024-01-15T10:35:00.000Z"
}`}
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Badge className="bg-green-500">POST</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/commands-ack</code>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  কমান্ড এক্সিকিউট হলে acknowledge করতে।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Request Body:</h4>
                  <CodeBlock
                    section="commands-ack-request"
                    language="json"
                    code={`{
  "device_id": "ESP32_LAYER_001",
  "command_ids": ["uuid-1", "uuid-2"]
}`}
                  />
                </div>

                <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">ব্যবহার</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    অ্যাপ থেকে ফ্যান/লাইট কন্ট্রোল করলে কমান্ড তৈরি হয়। ESP32 পোল করে কমান্ড পায় এবং execute করার পর acknowledge করে।
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">GET</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/settings</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  ফার্মের থ্রেশোল্ড সেটিংস পেতে। ESP32 বুট হলে এবং প্রতি ৫ মিনিটে একবার কল করুন।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Response:</h4>
                  <CodeBlock
                    section="settings-response"
                    language="json"
                    code={`{
  "success": true,
  "data": {
    "temperature_min": 20,
    "temperature_max": 32,
    "humidity_min": 50,
    "humidity_max": 70,
    "ammonia_max": 25
  }
}`}
                  />
                </div>
              </TabsContent>

              <TabsContent value="automation" className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">GET</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/system-status</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  ESP32 বুট/সিঙ্কের সময় এক কলে সব ডাটা পেতে। Settings, Rules, Status সব একসাথে।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Response:</h4>
                  <CodeBlock
                    section="system-status-response"
                    language="json"
                    code={`{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "settings_version": 1705312200000,
  "settings": {
    "temperature_min": 20,
    "temperature_max": 32,
    "hsi_automation_enabled": true,
    "fan_high_temp_min": 33
  },
  "device_status": {
    "mode": "AUTO",
    "fan_on": true,
    "fan_speed": "HIGH",
    "manual_override": false
  },
  "automation_rules": [...],
  "lighting": {...},
  "commands": [...]
}`}
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Badge className="bg-blue-500">GET</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/automation-rules</code>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  শুধু অটোমেশন নিয়মগুলো পেতে।
                </p>

                <div className="space-y-2">
                  <h4 className="font-medium">Response:</h4>
                  <CodeBlock
                    section="automation-response"
                    language="json"
                    code={`{
  "success": true,
  "data": [
    {
      "condition_sensor": "temperature",
      "condition_operator": ">",
      "condition_value": 30,
      "action_device": "fan",
      "action_state": true,
      "enabled": true
    }
  ]
}`}
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Badge className="bg-blue-500">GET</Badge>
                  <code className="text-sm bg-muted px-2 py-1 rounded">/lighting-schedule</code>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  লাইটিং সময়সূচী পেতে।
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hardware Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              হার্ডওয়্যার সেটআপ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium">প্রয়োজনীয় যন্ত্রাংশ:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    ESP32 DevKit (যেকোনো ভার্সন)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    DHT22 সেন্সর (তাপমাত্রা ও আর্দ্রতা)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    MQ135 সেন্সর (অ্যামোনিয়া)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    YF-S201 ফ্লো সেন্সর (ঐচ্ছিক)
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">ওয়্যারিং:</h4>
                <CodeBlock
                  section="wiring"
                  language="text"
                  code={`DHT22:
  VCC  → 3.3V
  GND  → GND
  DATA → GPIO 4 (10K pull-up)

MQ135:
  VCC → 5V
  GND → GND
  AO  → GPIO 34

Flow Sensor:
  Red    → 5V
  Black  → GND
  Yellow → GPIO 27`}
                />
              </div>
            </div>

            <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950">
              <h4 className="font-medium text-blue-800 dark:text-blue-200">টিপস</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mt-2">
                <li>• MQ135 সেন্সর ২৪-৪৮ ঘন্টা ওয়ার্ম-আপ দরকার</li>
                <li>• WiFi সংযোগ স্থিতিশীল রাখুন</li>
                <li>• পাওয়ার সাপ্লাই ৫V/২A হলে ভালো</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Base URL */}
        <Card>
          <CardHeader>
            <CardTitle>API Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              section="base-url"
              language="text"
              code={API_BASE_URL}
            />
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
