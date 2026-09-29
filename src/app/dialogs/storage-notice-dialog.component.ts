import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { I18nService } from '../i18n/i18n.service';

export interface StorageNoticeData {
  name: string;
  showNotice: boolean;
}

export interface StorageNoticeResult {
  name: string;
  dontShowAgain: boolean;
}

/** Shown when saving: asks for a name and explains where the data lives. */
@Component({
  selector: 'pe-storage-notice-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="filled-icon">save</mat-icon>
      {{ t().dialogs.saveTitle }}
    </h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ t().common.name }}</mat-label>
        <input
          matInput
          [value]="name()"
          (input)="name.set($any($event.target).value)"
          (keydown.enter)="confirm()"
          cdkFocusInitial
        />
      </mat-form-field>

      @if (data.showNotice) {
        <div class="notice">
          <mat-icon>info</mat-icon>
          <div>
            <strong>{{ t().dialogs.noticeTitle }}</strong>
            <ul>
              @for (point of t().dialogs.noticePoints; track $index) {
                <li>{{ point }}</li>
              }
            </ul>
          </div>
        </div>
        <mat-checkbox [checked]="dontShow()" (change)="dontShow.set($event.checked)">{{
          t().dialogs.dontShowAgain
        }}</mat-checkbox>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ t().common.cancel }}</button>
      <button mat-flat-button (click)="confirm()" [disabled]="!name().trim()">
        {{ t().dialogs.saveInBrowser }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2 {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .full {
      width: 100%;
      margin-top: 4px;
    }
    .notice {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
      margin-bottom: 8px;
      font: var(--mat-sys-body-medium);
      ul {
        margin: 6px 0 0;
        padding-left: 18px;
      }
      li {
        margin: 2px 0;
      }
      mat-icon {
        flex: none;
      }
    }
  `,
})
export class StorageNoticeDialogComponent {
  protected readonly t = inject(I18nService).t;
  readonly data = inject<StorageNoticeData>(MAT_DIALOG_DATA);
  private readonly ref =
    inject<MatDialogRef<StorageNoticeDialogComponent, StorageNoticeResult>>(MatDialogRef);
  readonly name = signal(this.data.name);
  readonly dontShow = signal(false);

  confirm(): void {
    if (!this.name().trim()) return;
    this.ref.close({ name: this.name().trim(), dontShowAgain: this.dontShow() });
  }
}
