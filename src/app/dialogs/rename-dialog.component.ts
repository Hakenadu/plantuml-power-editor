import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'pe-rename-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Umbenennen</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 4px">
        <mat-label>Name</mat-label>
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
      <button mat-button mat-dialog-close>Abbrechen</button>
      <button mat-flat-button (click)="confirm()" [disabled]="!name().trim()">Übernehmen</button>
    </mat-dialog-actions>
  `,
})
export class RenameDialogComponent {
  private readonly ref = inject<MatDialogRef<RenameDialogComponent, string>>(MatDialogRef);
  readonly name = signal(inject<string>(MAT_DIALOG_DATA));

  confirm(): void {
    if (this.name().trim()) this.ref.close(this.name().trim());
  }
}
