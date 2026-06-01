import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  profile: any = {
    prenom: '', nom: '', email: '',
    equipe: '', telephone: '', poste: '',
    dateNaissance: '', avatarUrl: null
  };

  formData: any = {};

  showPasswordModal = false;
  passwordForm = { current: '', nouveau: '', confirm: '' };
  passwordVisible = { current: false, nouveau: false, confirm: false };

  successMessage = '';
  errorMessage = '';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.profileService.getProfile().subscribe({
      next: (user: any) => {
        this.profile  = { ...user };
        this.formData = { ...user };
      },
      error: () => {
        this.showError('Impossible de charger le profil.');
        this.formData = { ...this.profile };
      }
    });
  }

  getInitials(): string {
    const p = this.formData.prenom?.charAt(0) || this.profile.prenom?.charAt(0) || '';
    const n = this.formData.nom?.charAt(0)    || this.profile.nom?.charAt(0)    || '';
    return (p + n).toUpperCase() || '??';
  }

  triggerAvatarUpload(): void {
    document.getElementById('avatarInput')?.click();
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showError('Veuillez sélectionner une image valide.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.formData.avatarUrl = result;
      this.profile.avatarUrl  = result;
    };
    reader.readAsDataURL(file);
  }

  onSave(): void {
    if (!this.formData.prenom?.trim() || !this.formData.nom?.trim()) {
      this.showError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (this.formData.telephone && !/^[0-9]{8}$/.test(this.formData.telephone)) {
      this.showError('Le numéro de téléphone doit contenir 8 chiffres.');
      return;
    }

    const payload = {
      nom:       this.formData.nom,
      prenom:    this.formData.prenom,
      telephone: this.formData.telephone || null,
      poste:     this.formData.poste     || null,
      avatarUrl: this.formData.avatarUrl || null
    };

    this.profileService.updateProfile(payload).subscribe({
      next: (updated: any) => {
        this.profile  = { ...this.profile, ...updated };  // garde email/equipe/dateNaissance
        this.formData = { ...this.profile };               // resync formData

        // ✅ Supprime ou met à jour l'avatar dans localStorage
        if (updated.avatarUrl) {
          localStorage.setItem('avatarUrl', updated.avatarUrl);
        } else {
          localStorage.removeItem('avatarUrl');  // suppression effective si avatar retiré
        }

        if (updated.prenom) localStorage.setItem('prenom', updated.prenom);
        if (updated.nom)    localStorage.setItem('nom',    updated.nom);

        this.showSuccess('Profil mis à jour avec succès !');
      },
      error: (err: any) => {
        console.error('Erreur update profil:', err);
        this.showError('Erreur lors de la mise à jour.');
      }
    });
  }

  openPasswordModal(): void {
    this.passwordForm    = { current: '', nouveau: '', confirm: '' };
    this.passwordVisible = { current: false, nouveau: false, confirm: false };
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordForm = { current: '', nouveau: '', confirm: '' };
  }

  onChangePassword(): void {
    if (!this.passwordForm.current) {
      this.showError('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (this.passwordForm.nouveau.length < 6) {
      this.showError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (this.passwordForm.nouveau !== this.passwordForm.confirm) {
      this.showError('Les mots de passe ne correspondent pas.');
      return;
    }

    this.profileService.changePassword(this.passwordForm.current, this.passwordForm.nouveau).subscribe({
      next: () => {
        this.closePasswordModal();
        this.showSuccess('Mot de passe modifié avec succès !');
      },
      error: (err: any) => {
        console.error('Erreur changement mot de passe:', err);
        this.showError('Mot de passe actuel incorrect.');
        this.passwordForm.current = '';
      }
    });
  }

  togglePasswordVisibility(field: 'current' | 'nouveau' | 'confirm'): void {
    this.passwordVisible[field] = !this.passwordVisible[field];
  }

  removeAvatar(): void {
    this.formData.avatarUrl = null;
    this.profile.avatarUrl  = null;
    localStorage.removeItem('avatarUrl');
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage   = '';
    setTimeout(() => (this.successMessage = ''), 4000);
  }

  private showError(msg: string): void {
    this.errorMessage   = msg;
    this.successMessage = '';
    setTimeout(() => (this.errorMessage = ''), 4000);
  }
}