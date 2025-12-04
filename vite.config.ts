import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vite-plugin-ip2region',
      configureServer(server) {
        // Defines the /api/ip2region endpoint
        server.middlewares.use('/api/ip2region', (req, res, next) => {
          const url = new URL(req.url || '', `http://${req.headers.host}`);
          
          // Only handle the specific API path
          if (url.pathname !== '/api/ip2region') {
            return next();
          }

          const ip = url.searchParams.get('ip');
          
          if (!ip) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing IP parameter' }));
            return;
          }

          // SIMULATION: In a real app, this would use the ip2region library:
          // const searcher = new Searcher({ dbPath: './ip2region.xdb' });
          // const data = searcher.search(ip);
          
          // Mocking data logic for demonstration
          // Format: Country|Region|Province|City|ISP
          let regionData = "United States|0|California|Mountain View|Google LLC";
          
          const parts = ip.split('.');
          const firstOctet = parseInt(parts[0] || '0', 10);
          
          if (firstOctet > 200) {
             regionData = "China|0|Shanghai|Shanghai|China Telecom";
          } else if (firstOctet > 150) {
             regionData = "Germany|0|Berlin|Berlin|Deutsche Telekom";
          } else if (firstOctet > 100) {
             regionData = "Japan|0|Tokyo|Tokyo|Softbank";
          } else if (parts[0] === '127') {
             regionData = "Local|0|0|0|Loopback";
          }

          const responseData = {
            region: regionData,
            ioCount: 1,
            took: 0
          };

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(responseData));
        });
      }
    }
  ]
});