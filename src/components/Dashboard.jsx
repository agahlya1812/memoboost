function Dashboard({
  stats,
  mastery,
  priorityEnvelope,
  priorityEnvelopes,
  folderProgress,
  favoriteFolders,
  favoriteEnvelopes,
  favoriteNotes,
  recentActivity,
  onOpenCategory,
  onOpenNote,
  onStartRevision,
  onAddFolder,
  onImportExport
}) {
  const masteryStyle = {
    '--dashboard-known': `${mastery.knownPercent}%`,
    '--dashboard-review': `${mastery.reviewPercent}%`,
    '--dashboard-unknown': `${mastery.unknownPercent}%`
  }

  const renderFavoriteList = (items, type, emptyLabel, openLabel) => {
    if (!items.length) {
      return <p className="dashboard-empty-copy">{emptyLabel}</p>
    }

    return (
      <div className="dashboard-favorite-list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="dashboard-favorite-item"
            onClick={() => {
              if (type === 'note') {
                onOpenNote(item)
                return
              }
              onOpenCategory(item.id)
            }}
          >
            <div>
              <strong>{item.name || item.title}</strong>
              <span>{item.meta || openLabel}</span>
            </div>
            <span className="dashboard-favorite-star" aria-hidden="true">★</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <section className="dashboard-shell" aria-label="Tableau de bord">
      <div className="dashboard-stats-grid">
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Dossiers</p>
          <strong className="dashboard-stat-value">{stats.folderCount}</strong>
          <span className="dashboard-stat-meta">{stats.activeFolderLabel}</span>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Enveloppes</p>
          <strong className="dashboard-stat-value">{stats.envelopeCount}</strong>
          <span className="dashboard-stat-meta">{stats.priorityEnvelopeLabel}</span>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Cartes</p>
          <strong className="dashboard-stat-value">{stats.cardCount}</strong>
          <span className="dashboard-stat-meta">{stats.pendingCardLabel}</span>
        </article>
        <article className="dashboard-stat-card">
          <p className="dashboard-stat-label">Notes</p>
          <strong className="dashboard-stat-value">{stats.noteCount}</strong>
          <span className="dashboard-stat-meta">{stats.noteLabel}</span>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-panel dashboard-panel--hero">
          <div className="dashboard-panel-header">
            <div>
              <h2>Révision du jour</h2>
              <p>La meilleure enveloppe à reprendre maintenant.</p>
            </div>
            <span className="dashboard-chip dashboard-chip--alert">
              {priorityEnvelope ? 'Urgent' : 'Disponible'}
            </span>
          </div>

          {priorityEnvelope ? (
            <div className="dashboard-hero-body">
              <div className="dashboard-hero-card">
                <span className="dashboard-kicker">Enveloppe prioritaire</span>
                <h3>{priorityEnvelope.name}</h3>
                <p>
                  {priorityEnvelope.pendingCount} cartes à retravailler dont {priorityEnvelope.reviewCount} déjà
                  marquées à revoir.
                </p>
                <div className="dashboard-hero-actions">
                  <button type="button" className="primary-button" onClick={() => onStartRevision(priorityEnvelope.id)}>
                    Lancer la révision
                  </button>
                  <button type="button" className="ghost-button" onClick={() => onOpenCategory(priorityEnvelope.id)}>
                    Ouvrir l'enveloppe
                  </button>
                </div>
              </div>

              <div className="dashboard-side-stack">
                <div className="dashboard-side-item">
                  <strong>Cartes à revoir</strong>
                  <span>{priorityEnvelope.reviewCount}</span>
                </div>
                <div className="dashboard-side-item">
                  <strong>Cartes à évaluer</strong>
                  <span>{priorityEnvelope.unknownCount}</span>
                </div>
                <div className="dashboard-side-item">
                  <strong>Total dans l'enveloppe</strong>
                  <span>{priorityEnvelope.cardCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <p>Aucune enveloppe prête pour une révision. Commence par créer un dossier puis une enveloppe.</p>
              <button type="button" className="primary-button" onClick={onAddFolder}>
                Ajouter un dossier
              </button>
            </div>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--mastery">
          <div className="dashboard-panel-header">
            <div>
              <h2>Niveau de maîtrise</h2>
              <p>Répartition actuelle des statuts de cartes.</p>
            </div>
            <span className="dashboard-panel-note">{stats.cardCount} cartes</span>
          </div>

          <div className="dashboard-mastery-ring" style={masteryStyle}>
            <div className="dashboard-mastery-ring-inner">
              <strong>{mastery.knownPercent}%</strong>
              <span>maîtrisées</span>
            </div>
          </div>

          <div className="dashboard-mastery-list">
            <div className="dashboard-mastery-row">
              <span className="dashboard-mastery-label">
                <span className="dashboard-swatch dashboard-swatch--known" />
                Maîtrisées
              </span>
              <strong>{mastery.knownCount}</strong>
            </div>
            <div className="dashboard-mastery-row">
              <span className="dashboard-mastery-label">
                <span className="dashboard-swatch dashboard-swatch--review" />
                À revoir
              </span>
              <strong>{mastery.reviewCount}</strong>
            </div>
            <div className="dashboard-mastery-row">
              <span className="dashboard-mastery-label">
                <span className="dashboard-swatch dashboard-swatch--unknown" />
                À évaluer
              </span>
              <strong>{mastery.unknownCount}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--favorites">
          <div className="dashboard-panel-header">
            <div>
              <h2>Favoris</h2>
              <p>Notes, dossiers et enveloppes épinglés.</p>
            </div>
            <span className="dashboard-chip">Local</span>
          </div>

          <div className="dashboard-favorites-grid">
            <section className="dashboard-favorite-card dashboard-favorite-card--folder">
              <div className="dashboard-favorite-header">
                <strong>Dossiers favoris</strong>
                <span>{favoriteFolders.length}</span>
              </div>
              {renderFavoriteList(
                favoriteFolders,
                'category',
                'Ajoute des étoiles sur tes dossiers pour les retrouver ici.',
                'Ouvrir le dossier'
              )}
            </section>

            <section className="dashboard-favorite-card dashboard-favorite-card--envelope">
              <div className="dashboard-favorite-header">
                <strong>Enveloppes favorites</strong>
                <span>{favoriteEnvelopes.length}</span>
              </div>
              {renderFavoriteList(
                favoriteEnvelopes,
                'category',
                'Ajoute des étoiles sur tes enveloppes pour lancer une révision plus vite.',
                'Ouvrir l’enveloppe'
              )}
            </section>

            <section className="dashboard-favorite-card dashboard-favorite-card--note">
              <div className="dashboard-favorite-header">
                <strong>Notes favorites</strong>
                <span>{favoriteNotes.length}</span>
              </div>
              {renderFavoriteList(
                favoriteNotes,
                'note',
                'Ajoute des étoiles sur tes notes pour les garder sous la main.',
                'Ouvrir la note'
              )}
            </section>
          </div>
        </article>

        <article className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panel-header">
            <div>
              <h2>Progression par dossier</h2>
              <p>Lecture rapide des dossiers les plus actifs.</p>
            </div>
            <span className="dashboard-panel-note">{folderProgress.length} dossiers</span>
          </div>

          {folderProgress.length ? (
            <div className="dashboard-progress-list">
              {folderProgress.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="dashboard-progress-row"
                  onClick={() => onOpenCategory(folder.id)}
                >
                  <div className="dashboard-progress-head">
                    <strong>{folder.name}</strong>
                    <span>{folder.progress}%</span>
                  </div>
                  <div className="dashboard-progress-track">
                    <span className="dashboard-progress-fill" style={{ width: `${folder.progress}%` }} />
                  </div>
                  <small>{folder.detail}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty-copy">Aucun dossier assez rempli pour calculer une progression.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--stack">
          <div className="dashboard-panel-header">
            <div>
              <h2>Enveloppes prioritaires</h2>
              <p>Les prochaines révisions utiles.</p>
            </div>
            <span className="dashboard-panel-note">{priorityEnvelopes.length}</span>
          </div>

          {priorityEnvelopes.length ? (
            <div className="dashboard-list">
              {priorityEnvelopes.map((envelope, index) => (
                <button
                  key={envelope.id}
                  type="button"
                  className="dashboard-list-row"
                  onClick={() => onOpenCategory(envelope.id)}
                >
                  <div>
                    <strong>{envelope.name}</strong>
                    <span>{envelope.pendingCount} cartes à traiter</span>
                  </div>
                  <span className={`dashboard-chip ${index === 0 ? 'dashboard-chip--alert' : ''}`}>
                    {index === 0 ? 'Priorité 1' : 'Ouvrir'}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty-copy">Les enveloppes prioritaires apparaîtront ici dès que tu auras des cartes.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--stack">
          <div className="dashboard-panel-header">
            <div>
              <h2>Activité récente</h2>
              <p>Les dernières modifications détectées.</p>
            </div>
          </div>

          {recentActivity.length ? (
            <div className="dashboard-list">
              {recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="dashboard-list-row dashboard-list-row--static">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <small>{item.timeLabel}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty-copy">L’activité récente apparaîtra ici après tes premières modifications.</p>
          )}
        </article>

        <article className="dashboard-panel dashboard-panel--stack">
          <div className="dashboard-panel-header">
            <div>
              <h2>Actions rapides</h2>
              <p>Raccourcis utiles depuis la racine.</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <button type="button" className="dashboard-action-card" onClick={onAddFolder}>
              <strong>Nouveau dossier</strong>
              <span>Créer une nouvelle zone de révision.</span>
            </button>
            <button type="button" className="dashboard-action-card" onClick={onImportExport}>
              <strong>Importer / Exporter</strong>
              <span>Ouvrir les formats JSON, CSV et PDF.</span>
            </button>
            <button
              type="button"
              className="dashboard-action-card"
              onClick={() => {
                if (priorityEnvelope) {
                  onStartRevision(priorityEnvelope.id)
                }
              }}
              disabled={!priorityEnvelope}
            >
              <strong>Session prioritaire</strong>
              <span>{priorityEnvelope ? priorityEnvelope.name : 'Aucune enveloppe prioritaire'}</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}

export default Dashboard
