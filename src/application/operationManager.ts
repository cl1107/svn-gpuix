import { MutationBusyError, type MutationKind } from '../domain/operation';

/** 同一时刻只允许一个 mutation（checkout / commit / update / revert / add / delete）。 */
export class OperationManager {
  private activeMutation: MutationKind | null = null;

  get running(): MutationKind | null {
    return this.activeMutation;
  }

  async runMutation<T>(kind: MutationKind, operation: () => Promise<T>): Promise<T> {
    if (this.activeMutation) {
      throw new MutationBusyError(this.activeMutation, kind);
    }
    this.activeMutation = kind;
    try {
      return await operation();
    } finally {
      this.activeMutation = null;
    }
  }
}