import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, Theme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();
  const { language } = useAuth();

  const themes: { value: Theme; label: string; labelBn: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', labelBn: 'লাইট', icon: Sun },
    { value: 'dark', label: 'Dark', labelBn: 'ডার্ক', icon: Moon },
    { value: 'system', label: 'System', labelBn: 'সিস্টেম', icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ value, label, labelBn, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={theme === value ? 'bg-accent' : ''}
          >
            <Icon className="mr-2 h-4 w-4" />
            {language === 'bn' ? labelBn : label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleSimple() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
