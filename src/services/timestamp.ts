// MOCK-ONLY SHIM — see CLAUDE_HANDOVER.md §5.
//
// A drop-in replacement for `firebase/firestore`'s `Timestamp` class covering
// the surface actually used by the UI (`toMillis`, `toDate`, `now`, `fromDate`,
// `fromMillis`). Consumers should import from `@/services/timestamp` instead
// of `firebase/firestore`. When Claude Code wires the real backend it can
// swap this import for the SDK re-export in a single place.

export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds: number = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  isEqual(other: Timestamp): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }

  valueOf(): string {
    // Matches Firebase's contract so comparison operators work.
    return `${this.seconds.toString().padStart(12, '0')}.${this.nanoseconds.toString().padStart(9, '0')}`;
  }

  toJSON(): { seconds: number; nanoseconds: number; type: string } {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds, type: 'timestamp' };
  }

  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number): Timestamp {
    const seconds = Math.floor(ms / 1000);
    const nanoseconds = (ms - seconds * 1000) * 1e6;
    return new Timestamp(seconds, nanoseconds);
  }
}
