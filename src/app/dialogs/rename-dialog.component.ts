import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { I18nService } from '../i18n/i18n.service';

/** Either the current name, or a name with custom dialog texts. */
export type NameDialogData = string | NameDialogOptions;
interface NameDialogOptions {
  name: string;
  title?: string;
  confirm?: string;
}

/** Asks for a name (renaming diagrams, naming custom themes). Closes with the trimmed name. */
@Component({
  selector: 'pe-rename-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title ?? t().common.rename }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 4px">
        <mat-label>{{ t().common.name }}</mat-label>
        <input
          matInput
          [value]="name()"
          (input)="name.set($any($event.target).value)"
          (keydown.enter)="confirm()"
          cdkFocusInitial
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ t().common.cancel }}</button>
      <button mat-flat-button (click)="confirm()" [disabled]="!name().trim()">
        {{ data.confirm ?? t().dialogs.apply }}
      </button>
    </mat-dialog-actions>
  `,
})
export class RenameDialogComponent {
  private readonly ref = inject<MatDialogRef<RenameDialogComponent, string>>(MatDialogRef);
  protected readonly t = inject(I18nService).t;
  private readonly raw = inject<NameDialogData>(MAT_DIALOG_DATA);
  protected readonly data: NameDialogOptions =
    typeof this.raw === 'string' ? { name: this.raw } : this.raw;
  readonly name = signal(this.data.name);

  confirm(): void {
    if (this.name().trim()) this.ref.close(this.name().trim());
  }
}
