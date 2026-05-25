<div class="app-root">

  <!-- TOPBAR -->
  <div class="topbar">
    <div class="topbar-left">
      <span class="brand">Ticket<span>Flow</span></span>
      <div class="breadcrumb">
        <span>Tunisie Telecom</span>
        <span>›</span>
        <span class="cur">Gestion de Projet</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="dot-online"></div>
    </div>
  </div>

  <div class="main-layout">

    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-section">
        {{ isMetier() ? 'Mes tickets' : 'Vues rapides' }}
      </div>

      <div class="nav-item active" (click)="quickFilter('ALL')">
        <span class="dot-status all"></span>
        {{ isMetier() ? 'Tous mes tickets' : 'Tous les tickets' }}
        <span class="nav-badge">{{ tickets.length }}</span>
      </div>
      <div class="nav-item" (click)="quickFilter('A_FAIRE')">
        <span class="dot-status todo"></span>
        À traiter
        <span class="nav-badge">{{ countTodo }}</span>
      </div>
      <div class="nav-item" (click)="quickFilter('EN_COURS')">
        <span class="dot-status prog"></span>
        En cours
        <span class="nav-badge">{{ countInProgress }}</span>
      </div>
      <div class="nav-item" (click)="quickFilter('FAIT')">
        <span class="dot-status done"></span>
        Résolus
        <span class="nav-badge">{{ countDone }}</span>
      </div>

      <div class="sidebar-section" style="margin-top: 12px;">Priorités</div>
      <div class="nav-item" (click)="selectedPriorite='ALL'; filterTickets()">
        <span class="nav-icon">—</span>
        Toutes
      </div>
      <div class="nav-item" (click)="selectedPriorite='HAUTE'; filterTickets()">
        <span class="nav-icon">↑</span>
        Haute
      </div>
      <div class="nav-item" (click)="selectedPriorite='MOYENNE'; filterTickets()">
        <span class="nav-icon">→</span>
        Moyenne
      </div>
      <div class="nav-item" (click)="selectedPriorite='BASSE'; filterTickets()">
        <span class="nav-icon">↓</span>
        Basse
      </div>
    </aside>

    <!-- CONTENT -->
    <main class="content">

      <div class="page-header">
        <div>
          <div class="page-title">
            {{ isMetier() ? 'Mes Tickets' : 'Tickets de Projet' }}
          </div>
          <div class="page-sub">
            {{ isMetier() ? 'Tickets que vous avez créés' : 'Gestion de Projet' }}
          </div>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="stats-bar">
        <div class="stat-card">
          <div class="stat-label">Total</div>
          <div class="stat-value">{{ tickets.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">À traiter</div>
          <div class="stat-value todo-color">{{ countTodo }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">En cours</div>
          <div class="stat-value prog-color">{{ countInProgress }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Résolus</div>
          <div class="stat-value done-color">{{ countDone }}</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrap">
          <span class="search-icon">⌕</span>
          <input
            type="text"
            placeholder="Rechercher un ticket..."
            [(ngModel)]="searchText"
            (input)="filterTickets()">
        </div>

        <select [(ngModel)]="selectedStatut" (change)="filterTickets()">
          <option value="ALL">Tous les statuts</option>
          <option value="A_FAIRE">À traiter</option>
          <option value="EN_COURS">En cours</option>
          <option value="FAIT">Résolus</option>
          <option value="APPROUVE">Approuvé</option>
          <option value="REJETE">Rejeté</option>
        </select>

        <select [(ngModel)]="selectedPriorite" (change)="filterTickets()">
          <option value="ALL">Toutes les priorités</option>
          <option value="HAUTE">Haute</option>
          <option value="MOYENNE">Moyenne</option>
          <option value="BASSE">Basse</option>
        </select>
      </div>

      <!-- Tableau -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Description</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th *ngIf="!isMetier()">Créé par</th>
              <th>Commentaires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filteredTickets">

              <td>
                <span class="ticket-id">{{ formatTicketId(t.id!) }}</span>
                <div class="td-titre" style="margin-top: 4px;">{{ t.titre }}</div>
              </td>

              <td>
                <div class="td-desc">{{ t.description }}</div>
              </td>

              <td>
                <span class="badge"
                  [ngClass]="{
                    'badge-todo':     t.statut === 'A_FAIRE',
                    'badge-progress': t.statut === 'EN_COURS',
                    'badge-done':     t.statut === 'FAIT',
                    'badge-rejected': t.statut === 'REJETE',
                    'badge-approved': t.statut === 'APPROUVE'
                  }">
                  <span class="badge-dot"></span>
                  {{
                    t.statut === 'A_FAIRE'  ? 'À traiter' :
                    t.statut === 'EN_COURS' ? 'En cours'  :
                    t.statut === 'FAIT'     ? 'Résolu'    :
                    t.statut === 'APPROUVE' ? 'Approuvé'  :
                    t.statut === 'REJETE'   ? 'Rejeté'    : t.statut
                  }}
                </span>
              </td>

              <td>
                <span class="prio"
                  [ngClass]="{
                    'prio-haute':   t.priorite === 'HAUTE',
                    'prio-moyenne': t.priorite === 'MOYENNE',
                    'prio-basse':   t.priorite === 'BASSE'
                  }">
                  <span class="prio-dot"></span>
                  {{
                    t.priorite === 'HAUTE'   ? 'Haute'   :
                    t.priorite === 'MOYENNE' ? 'Moyenne' :
                    t.priorite === 'BASSE'   ? 'Basse'   : t.priorite
                  }}
                </span>
              </td>

              <td *ngIf="!isMetier()">
                <div class="avatar-inline">
                  <span class="avatar-circle">
                    {{ getInitials(t.userNomComplet || '') }}
                  </span>
                  <span class="td-small">{{ t.userNomComplet || '—' }}</span>
                </div>
              </td>

              <td>
                <button class="comment-btn" (click)="openCommentBox(t.id!)">
                  💬 {{ t.nombreCommentaires || 0 }}
                </button>
              </td>

              <td>
                <div class="actions-cell">
                  <button
                    class="action-btn"
                    title="Modifier (uniquement si À traiter)"
                    [disabled]="t.statut !== 'A_FAIRE'"
                    (click)="openEditModal(t)">
                    ✏
                  </button>

                  <button
                    *ngIf="isAdmin() || isMetier()"
                    class="action-btn danger"
                    title="Supprimer"
                    [disabled]="t.statut !== 'A_FAIRE'"
                    (click)="deleteTicket(t.id!)">
                    🗑
                  </button>
                </div>
              </td>

            </tr>
          </tbody>
        </table>

        <div class="empty-state" *ngIf="filteredTickets.length === 0 && !loading">
          <div class="empty-icon">📭</div>
          {{ isMetier()
              ? 'Vous n\'avez créé aucun ticket correspondant aux filtres.'
              : 'Aucun ticket ne correspond aux filtres sélectionnés.' }}
        </div>

        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          Chargement...
        </div>

        <div class="error-state" *ngIf="error">
          ⚠ {{ error }}
        </div>
      </div>

    </main>
  </div>

</div>


<!-- MODAL COMMENTAIRES -->
<div class="overlay" *ngIf="showCommentModal" (click)="closeCommentBox()">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <div>
        <div class="modal-title">Commentaires</div>
        <div class="modal-sub">{{ formatTicketId(activeCommentTicketId) }}</div>
      </div>
      <button class="modal-close" (click)="closeCommentBox()">✕</button>
    </div>
    <div class="modal-body">
      <div class="comment-list-wrap">
        <div class="no-comments" *ngIf="commentaires.length === 0">
          Aucun commentaire pour ce ticket.
        </div>
        <div class="comment-item" *ngFor="let c of commentaires">
          <div class="comment-avatar">
            {{ getInitials(c.nomAuteur || c.username || c.utilisateur?.nom || 'U') }}
          </div>
          <div class="comment-content">
            <div class="comment-meta">
              {{ c.nomAuteur || c.username || c.utilisateur?.nom || 'Tunisie Telecom' }}
            </div>
            <div class="comment-text">{{ c.commentaire }}</div>
          </div>
          <button
            *ngIf="isAdmin()"
            class="comment-del"
            title="Supprimer"
            (click)="deleteComment(c.id)">✕</button>
        </div>
      </div>
      <div class="comment-input-row">
        <input
          type="text"
          placeholder="Ajouter un commentaire..."
          [(ngModel)]="commentText"
          (keyup.enter)="addComment()">
        <button class="btn btn-primary" (click)="addComment()">Envoyer</button>
      </div>
    </div>
  </div>
</div>


<!-- MODAL MODIFICATION -->
<div class="overlay" *ngIf="showEditModal" (click)="closeEditModal()">
  <div class="modal" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <div>
        <div class="modal-title">Modifier le ticket</div>
        <div class="modal-sub" *ngIf="editingTicket">
          {{ formatTicketId(editingTicket.id) }}
        </div>
      </div>
      <button class="modal-close" (click)="closeEditModal()">✕</button>
    </div>
    <div class="modal-body" *ngIf="editingTicket">
      <div class="form-row">
        <label class="form-label">Titre</label>
        <input class="form-input" type="text" [(ngModel)]="editingTicket.titre">
      </div>
      <div class="form-row">
        <label class="form-label">Description</label>
        <textarea class="form-textarea"
                  [(ngModel)]="editingTicket.description"></textarea>
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label class="form-label">Priorité</label>
          <select class="form-select" [(ngModel)]="editingTicket.priorite">
            <option value="HAUTE">Haute</option>
            <option value="MOYENNE">Moyenne</option>
            <option value="BASSE">Basse</option>
          </select>
        </div>
        <div class="form-row">
          <label class="form-label">Date souhaitée</label>
          <input class="form-input" type="date"
                 [(ngModel)]="editingTicket.dateSouhaite">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" (click)="closeEditModal()">Annuler</button>
      <button class="btn btn-primary" (click)="saveEdit()">Enregistrer</button>
    </div>
  </div>
</div>