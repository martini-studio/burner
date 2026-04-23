import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Database, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AppHeader } from '@/components/AppHeader';
import { getSettings, saveSettings, type AppSettings } from '@/lib/settings';
import { twilio } from '@/lib/twilio';
import { toast } from 'sonner';
import db from '@/lib/db';
import { useTheme } from '@/hooks/use-theme';

const COUNTRIES = [
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'NZ', name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; name?: string } | null>(null);
  const [dbStats, setDbStats] = useState({ numbers: 0, conversations: 0, messages: 0 });

  useEffect(() => {
    loadDbStats();
  }, []);

  async function loadDbStats() {
    const [numbers, conversations, messages] = await Promise.all([
      db.numbers.count(),
      db.conversations.count(),
      db.messages.count(),
    ]);
    setDbStats({ numbers, conversations, messages });
  }

  function handleChange(key: keyof AppSettings, value: string | number) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  }

  function handleSave() {
    saveSettings(settings);
    toast.success('Settings saved');
  }

  async function handleTest() {
    saveSettings(settings);
    setTesting(true);
    setTestResult(null);
    try {
      const result = await twilio.testCredentials();
      setTestResult({ success: result.success, name: result.friendlyName });
      if (result.success) {
        toast.success(`Connected to ${result.friendlyName || 'Twilio'}`);
      } else {
        toast.error('Invalid credentials');
      }
    } catch {
      setTestResult({ success: false });
      toast.error('Connection failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleClearData() {
    if (!confirm('This will delete all local conversations and messages. Your Twilio numbers will NOT be released. Continue?')) return;
    await db.messages.clear();
    await db.conversations.clear();
    await loadDbStats();
    toast.success('Local data cleared');
  }

  async function handleClearAll() {
    if (!confirm('This will delete ALL local data including saved numbers. Your Twilio numbers will NOT be released. Continue?')) return;
    await db.messages.clear();
    await db.conversations.clear();
    await db.numbers.clear();
    await loadDbStats();
    toast.success('All data cleared');
  }

  return (
    <>
      <AppHeader className="gap-1 px-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-[15px] font-semibold">Settings</h1>
      </AppHeader>

      <main>
        <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-8 pt-app-header">
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Twilio Credentials</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your credentials are stored locally in your browser and never sent to any third-party server.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="sid" className="text-sm mb-1.5 block">Account SID</Label>
                <Input
                  id="sid"
                  value={settings.twilioAccountSid}
                  onChange={(e) => handleChange('twilioAccountSid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="token" className="text-sm mb-1.5 block">Auth Token</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? 'text' : 'password'}
                    value={settings.twilioAuthToken}
                    onChange={(e) => handleChange('twilioAuthToken', e.target.value)}
                    placeholder="Your auth token"
                    className="font-mono text-sm pr-10"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing || !settings.twilioAccountSid || !settings.twilioAuthToken}
                  className="flex-1"
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : testResult?.success ? (
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  ) : testResult && !testResult.success ? (
                    <XCircle className="h-4 w-4 mr-2 text-destructive" />
                  ) : null}
                  Test Connection
                </Button>
              </div>

              {testResult?.success && testResult.name && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Connected to account: {testResult.name}
                </p>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Preferences</h2>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Appearance</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition-colors ${
                      theme === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">Default Country</Label>
              <Select
                value={settings.defaultCountry}
                onValueChange={(val) => {
                  if (val) {
                    handleChange('defaultCountry', val);
                    saveSettings({ ...settings, defaultCountry: val });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="mr-2">{c.flag}</span> {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm mb-1.5 block">Message Polling Interval</Label>
              <Select
                value={String(settings.pollingInterval)}
                onValueChange={(val) => {
                  if (val) {
                    const interval = Number(val);
                    handleChange('pollingInterval', interval);
                    saveSettings({ ...settings, pollingInterval: interval });
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5000">5 seconds</SelectItem>
                  <SelectItem value="10000">10 seconds</SelectItem>
                  <SelectItem value="30000">30 seconds</SelectItem>
                  <SelectItem value="60000">1 minute</SelectItem>
                  <SelectItem value="0">Off</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                How often to check Twilio for new incoming messages. Shorter intervals use more API calls.
              </p>
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Local Data</h2>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Numbers</span>
                <span className="font-medium">{dbStats.numbers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversations</span>
                <span className="font-medium">{dbStats.conversations}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-medium">{dbStats.messages}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={handleClearData}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear Conversations & Messages
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive"
                onClick={handleClearAll}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear All Local Data
              </Button>
            </div>
          </section>

          <div className="pt-4 pb-8 text-center">
            <p className="text-xs text-muted-foreground">
              Burner v1.0 &middot; All data stored locally in your browser
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
