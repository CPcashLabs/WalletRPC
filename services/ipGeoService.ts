/**
 * Service for local IP Geolocation using the /api/ip2region endpoint.
 * Replaces the AI-based service for faster, offline-capable lookup.
 */

interface IpStats {
  total: number;
  countries: Record<string, number>;
  isps: Record<string, number>;
  cities: Record<string, number>;
}

export const analyzeIpCsvLocal = async (csvContent: string): Promise<{ csv: string, report: string }> => {
  const lines = csvContent.split(/\r?\n/);
  if (lines.length === 0) throw new Error("Empty CSV");

  const header = lines[0].split(',');
  
  // Detect IP column (simple heuristic: contains "ip" case-insensitive)
  const ipColIndex = header.findIndex(col => col.toLowerCase().includes('ip'));
  
  if (ipColIndex === -1) {
    throw new Error("Could not detect an 'IP' column in the CSV header.");
  }

  // Add new headers
  const newHeader = [...header, 'Country', 'City', 'ISP'];
  const newLines = [newHeader.join(',')];
  
  const stats: IpStats = {
    total: 0,
    countries: {},
    isps: {},
    cities: {}
  };

  // Process rows
  // Note: In a production app, we would limit concurrency here.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(',');
    const ip = columns[ipColIndex]?.trim();

    if (ip) {
      try {
        const response = await fetch(`/api/ip2region?ip=${ip}`);
        const data = await response.json();
        
        // ip2region format: Country|Region|Province|City|ISP
        // "0" indicates missing data
        const parts = (data.region || "Unknown|0|Unknown|Unknown|Unknown").split('|');
        
        const country = parts[0] !== '0' ? parts[0] : 'Unknown';
        const city = parts[3] !== '0' ? parts[3] : 'Unknown';
        const isp = parts[4] !== '0' ? parts[4] : 'Unknown';

        // Update stats
        stats.total++;
        stats.countries[country] = (stats.countries[country] || 0) + 1;
        stats.cities[city] = (stats.cities[city] || 0) + 1;
        stats.isps[isp] = (stats.isps[isp] || 0) + 1;

        columns.push(country, city, isp);
      } catch (err) {
        console.warn(`Failed to lookup IP: ${ip}`, err);
        columns.push('Error', 'Error', 'Error');
      }
    } else {
        columns.push('', '', '');
    }

    newLines.push(columns.join(','));
  }

  const report = generateMarkdownReport(stats);
  
  return {
    csv: newLines.join('\n'),
    report
  };
};

const generateMarkdownReport = (stats: IpStats): string => {
  const getTop = (record: Record<string, number>, limit = 5) => {
    return Object.entries(record)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  };

  return `
# Local IP Analysis Report

**Total IPs Processed:** ${stats.total}

### 🌍 Geographic Distribution
${getTop(stats.countries).map(([country, count]) => `- **${country}**: ${count}`).join('\n')}

### 🏙️ Top Cities
${getTop(stats.cities).map(([city, count]) => `- **${city}**: ${count}`).join('\n')}

### 🏢 Network ISPs
${getTop(stats.isps).map(([isp, count]) => `- **${isp}**: ${count}`).join('\n')}

---
*Generated locally using ip2region database.*
`;
};