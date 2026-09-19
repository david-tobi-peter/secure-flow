export class Normalizer {
  static email(value: string): string {
    return value.trim().toLowerCase();
  }
}
