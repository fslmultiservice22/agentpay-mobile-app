import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Versioni disponibili dell'app
 */
const AVAILABLE_VERSIONS = [
  {
    version: '1.0.0',
    buildNumber: 1,
    releaseDate: '2026-05-23',
    changelog: ['Initial release'],
    downloadUrl: 'https://play.google.com/store/apps/details?id=space.manus.agentpay',
    minSdkVersion: 24,
    minOsVersion: '7.0',
    isRequired: false,
  },
  {
    version: '1.1.0',
    buildNumber: 2,
    releaseDate: '2026-05-24',
    changelog: [
      'Added Telegram integration',
      'Improved portfolio display',
      'Bug fixes',
    ],
    downloadUrl: 'https://play.google.com/store/apps/details?id=space.manus.agentpay',
    minSdkVersion: 24,
    minOsVersion: '7.0',
    isRequired: false,
  },
  {
    version: '1.2.0',
    buildNumber: 3,
    releaseDate: '2026-05-25',
    changelog: [
      'OTA update system',
      'Security improvements',
      'GDPR compliance',
      'Performance optimizations',
    ],
    downloadUrl: 'https://play.google.com/store/apps/details?id=space.manus.agentpay',
    minSdkVersion: 24,
    minOsVersion: '7.0',
    isRequired: false,
  },
];

/**
 * Controlla se è disponibile un aggiornamento
 */
router.post('/check-update', (req: Request, res: Response) => {
  try {
    const { currentVersion } = req.body;

    if (!currentVersion) {
      return res.status(400).json({ error: 'Missing currentVersion' });
    }

    // Trova la versione più recente
    const latestVersion = AVAILABLE_VERSIONS[AVAILABLE_VERSIONS.length - 1];

    // Confronta le versioni
    const updateAvailable = compareVersions(latestVersion.version, currentVersion) > 0;

    res.status(200).json({
      ...latestVersion,
      updateAvailable,
    });
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Ottiene le informazioni di una versione specifica
 */
router.get('/version/:version', (req: Request, res: Response) => {
  try {
    const { version } = req.params;

    const versionInfo = AVAILABLE_VERSIONS.find((v) => v.version === version);

    if (!versionInfo) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.status(200).json(versionInfo);
  } catch (error) {
    console.error('Error getting version info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Ottiene tutte le versioni disponibili
 */
router.get('/versions', (req: Request, res: Response) => {
  try {
    res.status(200).json(AVAILABLE_VERSIONS);
  } catch (error) {
    console.error('Error getting versions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Scarica il file di aggiornamento
 */
router.get('/download/:version', (req: Request, res: Response) => {
  try {
    const { version } = req.params;

    const versionInfo = AVAILABLE_VERSIONS.find((v) => v.version === version);

    if (!versionInfo) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // In produzione, qui scaricheremmo il file APK/IPA
    // Per ora, reindirizzamo al Play Store
    res.redirect(versionInfo.downloadUrl);
  } catch (error) {
    console.error('Error downloading update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Segnala il completamento dell'aggiornamento
 */
router.post('/report-update', (req: Request, res: Response) => {
  try {
    const { fromVersion, toVersion, success, errorMessage } = req.body;

    if (!fromVersion || !toVersion) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`Update report: ${fromVersion} -> ${toVersion}, success: ${success}`);

    if (!success && errorMessage) {
      console.error(`Update error: ${errorMessage}`);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error reporting update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Confronta due versioni (semver)
 * Ritorna: 1 se v1 > v2, -1 se v1 < v2, 0 se v1 == v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

export default router;
