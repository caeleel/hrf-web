import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);

class Deployer {
  currentProcess: ReturnType<typeof spawn> | null = null;

  async deploy() {
    try {
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
      console.log('Starting new process...');
      this.currentProcess = spawn('npm', ['run', 'start'], {
        stdio: 'inherit',
        shell: true
      });

      // Handle process events
      this.currentProcess.on('error', (err) => {
        console.error('Failed to start process:', err);
      });

      this.currentProcess.on('exit', (code, signal) => {
        if (code !== null) {
          console.log(`Process exited with code ${code}`);
        } else if (signal !== null) {
          console.log(`Process killed with signal ${signal}`);
        }
        this.currentProcess = null;
      });

    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }
}

// Create deployer instance
const deployer = new Deployer();

// Create HTTP server
const server = http.createServer(async (req, res) => {
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
  console.log('Deployment server listening on port 8084');
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