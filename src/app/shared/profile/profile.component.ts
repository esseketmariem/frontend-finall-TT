import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { ChangePasswordComponent } from '../change-password/change-password.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChangePasswordComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user: any = null;
  profileForm!: FormGroup;
  isLoading = false;
  avatarPreview: string | null = null;
  showPasswordModal = false;

  defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%232d3548'/><circle cx='50' cy='38' r='18' fill='%2394a3b8'/><ellipse cx='50' cy='85' rx='30' ry='22' fill='%2394a3b8'/></svg>`;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      telephone: [''],
      poste: [''],
      dateNaissance: ['']
    });

    this.profileService.getProfile().subscribe({
      next: (data: any) => {
        this.user = data;
        this.profileForm.patchValue({
          prenom: data.prenom,
          nom: data.nom,
          telephone: data.telephone,
          poste: data.poste,
          dateNaissance: data.dateNaissance
        });
        if (data.avatarUrl) {
          this.avatarPreview = data.avatarUrl;
        }
      },
      error: (err: any) => console.error('Erreur chargement profil', err)
    });
  }

  onSubmit(): void {
    if (this.profileForm.invalid) return;
    this.isLoading = true;
    this.profileService.updateProfile(this.profileForm.value).subscribe({
      next: (data: any) => {
        this.user = data;
        this.isLoading = false;
        alert('Profil mis à jour avec succès');
      },
      error: (err: any) => {
        console.error('Erreur mise à jour', err);
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => this.avatarPreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  openChangePasswordModal(): void {
    this.showPasswordModal = true;
  }

  closeChangePasswordModal(): void {
    this.showPasswordModal = false;
  }
}