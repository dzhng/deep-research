import { ResearchProgress } from './deep-research';

export class ProgressManager {
  private lastProgress: ResearchProgress | undefined;
  private progressLines: number = 4; // Fixed number of lines for progress display
  private initialized: boolean = false;
  
  constructor() {
    // Initialize terminal
    process.stdout.write('\n'.repeat(this.progressLines));
  }
  
  private drawProgressBar(
    label: string,
    value: number,
    total: number,
    char: string = '='
  ): string {
    const width = process.stdout.columns ? Math.min(30, process.stdout.columns - 20) : 30;
    const percent = (value / total) * 100;
    const filled = Math.round((width * percent) / 100);
    const empty = width - filled;
    
    return `${label} [${char.repeat(filled)}${' '.repeat(empty)}] ${Math.round(percent)}%`;
  }
  
  updateProgress(progress: ResearchProgress) {
    // Store progress for potential redraw
    this.lastProgress = progress;
    
    // Calculate position for progress bars (at bottom of terminal)
    const terminalHeight = process.stdout.rows || 24;
    const progressStart = terminalHeight - this.progressLines;
    
    // Move cursor to progress area
    process.stdout.write(`\x1B[${progressStart};1H\x1B[0J`);
    
    // Draw progress bars horizontally
    const lines = [
      this.drawProgressBar(
        'Depth:   ',
        progress.totalDepth - progress.currentDepth,
        progress.totalDepth,
        '█'
      ),
      this.drawProgressBar(
        'Breadth: ',
        progress.totalBreadth - progress.currentBreadth,
        progress.totalBreadth,
        '█'
      ),
      this.drawProgressBar(
        'Queries: ',
        progress.completedQueries,
        progress.totalQueries,
        '█'
      ),
    ];
    
    // Add current query if available
    if (progress.currentQuery) {
      lines.push(`Current:  ${progress.currentQuery}`);
    }
    
    // Output progress bars at fixed position
    process.stdout.write(lines.join('\n') + '\n');
    
    // Move cursor back up for next output
    process.stdout.write(`\x1B[${this.progressLines}A`);
  }
  
  stop() {
    // Move cursor past progress area
    process.stdout.write(`\x1B[${this.progressLines}B\n`);
  }
}
