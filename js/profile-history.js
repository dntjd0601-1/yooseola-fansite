function renderProfileHistory() {
  const timelineEl = document.getElementById('profileTimeline');
  const contentEl = document.getElementById('profileContentGroups');
  if (!timelineEl || !Array.isArray(PROFILE_HISTORY)) return;

  timelineEl.replaceChildren();
  const fragment = document.createDocumentFragment();

  PROFILE_HISTORY.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'timeline__item reveal';
    item.innerHTML = `
      <div class="timeline__dot"></div>
      <div class="timeline__content">
        <img class="timeline__icon" src="images/logos/${entry.icon}" alt="" width="40" height="40" loading="lazy" decoding="async">
        <div class="timeline__body">
          <time class="timeline__date">${entry.date}</time>
          <h3 class="timeline__title">${entry.title}</h3>
          <p class="timeline__text">${entry.text}</p>
        </div>
      </div>
    `;
    fragment.appendChild(item);
  });

  timelineEl.appendChild(fragment);

  if (!contentEl || !Array.isArray(PROFILE_CONTENT_GROUPS)) return;

  contentEl.replaceChildren();
  const contentFragment = document.createDocumentFragment();

  PROFILE_CONTENT_GROUPS.forEach((group) => {
    const section = document.createElement('div');
    const heading = document.createElement('h4');
    heading.className = 'profile__content-cat';
    heading.textContent = group.title;

    const grid = document.createElement('div');
    grid.className = 'profile__content-grid';

    group.items.forEach((item) => {
      const article = document.createElement('article');
      article.className = 'profile__content-item';
      article.innerHTML = `
        <div class="profile__content-head">
          <img class="profile__icon" src="images/logos/${item.icon}" alt="" width="44" height="44" loading="lazy" decoding="async">
          <div class="profile__content-head-text">
            <h5 class="profile__content-name">${item.name}</h5>
            <p class="profile__content-meta">${item.meta}</p>
          </div>
        </div>
        <p class="profile__content-note">${item.note}</p>
      `;
      grid.appendChild(article);
    });

    section.append(heading, grid);
    contentFragment.appendChild(section);
  });

  contentEl.appendChild(contentFragment);
}

document.addEventListener('DOMContentLoaded', renderProfileHistory);
