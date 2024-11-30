import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

const execAsync = promisify(exec);

class Deployer {
  currentProcess: ReturnType<typeof spawn> | null = null;
  isProd: boolean;

  constructor() {
    this.isProd = process.argv.includes('prod');
  }

  async deploy() {
    try {
      if (this.isProd) {
        await this.deployProd();
      } else {
        await this.deployDev();
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  private async deployProd() {
    // Pull latest changes
    console.log('Pulling latest changes...');
    await execAsync('git pull');

    // Build the project
    console.log('Building project...');
    await execAsync('npm run build');

    // Kill existing process if it exists
    if (this.currentProcess) {
      console.log('Stopping existing process...');
      this.currentProcess.kill();
      this.currentProcess = null;
    }

    // Start new process
    console.log('Starting production process...');
    this.currentProcess = spawn('npm', ['run', 'start'], {
      stdio: 'inherit',
      shell: true
    });

    this.setupProcessHandlers();
  }

  private async deployDev() {
    if (this.currentProcess) {
      // In dev mode, just pull changes on reload
      console.log('Pulling latest changes...');
      await execAsync('git pull');
    } else {
      // Initial startup in dev mode
      console.log('Starting development process...');
      this.currentProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      });

      this.setupProcessHandlers();
    }
  }

  private setupProcessHandlers() {
    if (!this.currentProcess) return;

    this.currentProcess.on('error', (err: Error) => {
      console.error('Failed to start process:', err);
    });

    this.currentProcess.on('exit', (code: number | null, signal: string | null) => {
      if (code !== null) {
        console.log(`Process exited with code ${code}`);
      } else if (signal !== null) {
        console.log(`Process killed with signal ${signal}`);
      }
      this.currentProcess = null;
    });
  }
}

// Create deployer instance
const deployer = new Deployer();

// Create HTTP server
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === '/reload' && req.method === 'POST') {
    console.log('Received reload request');
    try {
      await deployer.deploy();
      res.writeHead(200);
      res.end('Deployment successful');
    } catch (error) {
      res.writeHead(500);
      res.end('Deployment failed');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start server and initial deployment
server.listen(8084, async () => {
  console.log(`Deployment server listening on port 8084 (${deployer.isProd ? 'production' : 'development'} mode)`);
  try {
    await deployer.deploy();
  } catch (error) {
    console.error('Initial deployment failed:', error);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal');
  if (deployer.currentProcess) {
    deployer.currentProcess.kill();
  }
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal');
  if (deployer.currentProcess) {
    deployer.currentProcess.kill();
  }
  server.close(() => {
    process.exit(0);
  });
}); 