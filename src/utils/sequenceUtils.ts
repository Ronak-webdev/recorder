/**
 * Smart Sequence Utility
 * Predicts the next logical ID based on input patterns (Numeric, Alphanumeric, or Alphabetical).
 */
export const SequenceUtils = {
  /**
   * Increments a string based on its pattern.
   * Examples:
   * "001" -> "002"
   * "Ronak001" -> "Ronak002"
   * "A" -> "B"
   * "Z" -> "AA"
   */
  getNextValue(currentValue: string): string {
    // 1. Check for trailing numbers (e.g., 001, Ronak001)
    const numericMatch = currentValue.match(/^(.*?)(\d+)$/);
    if (numericMatch) {
      const prefix = numericMatch[1];
      const numberStr = numericMatch[2];
      const nextNumber = parseInt(numberStr, 10) + 1;
      // Preserve padding (e.g., 001 -> 002)
      const paddedNumber = String(nextNumber).padStart(numberStr.length, '0');
      return `${prefix}${paddedNumber}`;
    }

    // 2. Check for single/multiple letters (e.g., A, B, Z)
    const alphaMatch = currentValue.match(/^[a-zA-Z]+$/);
    if (alphaMatch) {
      return this.incrementAlpha(currentValue);
    }

    // 3. Fallback: append 001 if no pattern is found
    return `${currentValue}001`;
  },


  /**
   * Helper to increment alphabetical strings (A -> B, Z -> AA)
   */
  incrementAlpha(s: string): string {
    const lastChar = s.charCodeAt(s.length - 1);
    
    // Check if it's Z or z
    if (lastChar === 90) return s.slice(0, -1) + 'AA'; // Z -> AA
    if (lastChar === 122) return s.slice(0, -1) + 'aa'; // z -> aa
    
    return s.slice(0, -1) + String.fromCharCode(lastChar + 1);
  }
};
