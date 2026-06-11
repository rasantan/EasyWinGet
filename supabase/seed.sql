-- Dev seed: popular WinGet packages (run once in Supabase SQL editor or via MCP)
-- See supabase/migrations for schema

INSERT INTO public.packages (package_id, name, publisher, description, version, installer_type, categories, moniker) VALUES
('Git.Git', 'Git', 'The Git Development Community', 'Version control system', '2.47.1', 'exe', ARRAY['developer-tools'], 'git'),
('Microsoft.PowerToys', 'PowerToys', 'Microsoft Corporation', 'Windows utilities', '0.87.1', 'exe', ARRAY['utilities'], 'powertoys'),
('7zip.7zip', '7-Zip', 'Igor Pavlov', 'File archiver', '24.09', 'exe', ARRAY['utilities'], '7zip'),
('Mozilla.Firefox', 'Firefox', 'Mozilla', 'Web browser', '134.0', 'exe', ARRAY['browsers'], 'firefox'),
('Google.Chrome', 'Google Chrome', 'Google LLC', 'Web browser', '131.0', 'exe', ARRAY['browsers'], 'chrome'),
('Notepad++.Notepad++', 'Notepad++', 'Notepad++ Team', 'Code editor', '8.7.5', 'exe', ARRAY['developer-tools'], 'notepad++'),
('Microsoft.VisualStudioCode', 'Visual Studio Code', 'Microsoft Corporation', 'Code editor', '1.96.2', 'exe', ARRAY['developer-tools'], 'vscode'),
('Valve.Steam', 'Steam', 'Valve Corporation', 'Game platform', '4.0', 'exe', ARRAY['games'], 'steam'),
('Discord.Discord', 'Discord', 'Discord Inc.', 'Voice and chat', '1.0.9188', 'exe', ARRAY['social'], 'discord'),
('Spotify.Spotify', 'Spotify', 'Spotify AB', 'Music streaming', '1.2.52', 'exe', ARRAY['multimedia'], 'spotify'),
('VideoLAN.VLC', 'VLC media player', 'VideoLAN', 'Media player', '3.0.21', 'exe', ARRAY['multimedia'], 'vlc'),
('Python.Python.3.12', 'Python 3.12', 'Python Software Foundation', 'Programming language', '3.12.8', 'exe', ARRAY['developer-tools'], 'python'),
('OpenJS.NodeJS.LTS', 'Node.js LTS', 'OpenJS Foundation', 'JavaScript runtime', '22.13.0', 'exe', ARRAY['developer-tools'], 'nodejs'),
('Docker.DockerDesktop', 'Docker Desktop', 'Docker Inc.', 'Container platform', '4.37.1', 'exe', ARRAY['developer-tools'], 'docker'),
('Postman.Postman', 'Postman', 'Postman', 'API client', '11.28.0', 'exe', ARRAY['developer-tools'], 'postman'),
('Zoom.Zoom', 'Zoom', 'Zoom Video Communications', 'Video conferencing', '6.3.0', 'exe', ARRAY['productivity'], 'zoom'),
('SlackTechnologies.Slack', 'Slack', 'Slack Technologies', 'Team messaging', '4.41.105', 'exe', ARRAY['productivity'], 'slack'),
('Obsidian.Obsidian', 'Obsidian', 'Obsidian', 'Notes app', '1.7.7', 'exe', ARRAY['productivity'], 'obsidian'),
('FileZilla.FileZilla', 'FileZilla', 'FileZilla Project', 'FTP client', '3.68.1', 'exe', ARRAY['utilities'], 'filezilla'),
('Audacity.Audacity', 'Audacity', 'Audacity Team', 'Audio editor', '3.7.1', 'exe', ARRAY['multimedia'], 'audacity')
ON CONFLICT (package_id) DO NOTHING;
