-- Add 'info' value to alert_severity enum
ALTER TYPE alert_severity ADD VALUE IF NOT EXISTS 'info' BEFORE 'warning';