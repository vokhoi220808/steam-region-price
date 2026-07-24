import TrackerRepository from '../storage/storage-repository.js';
import { computeStatus } from './tracker-status.js';

class TrackerStore {
  constructor() {
    this.games = [];
    this.preferences = null;
    this.collections = [];
    this.listeners = new Set();
  }

  init() {
    TrackerRepository.init();
    this.reload(false);
    return this.getState();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(change = { type: 'refresh' }) {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state, change));
  }

  reload(emit = true) {
    this.games = TrackerRepository.getAll();
    this.preferences = TrackerRepository.getPreferences();
    this.collections = TrackerRepository.getCollections();
    if (emit) this.emit({ type: 'reload' });
    return this.getState();
  }

  getState() {
    return {
      games: this.getAllGames(),
      preferences: structuredClone(this.preferences),
      collections: structuredClone(this.collections)
    };
  }

  getAllGames() {
    return this.games.map((game) => ({ ...game, status: computeStatus(game) }));
  }

  getGame(id) {
    const game = this.games.find((item) => item.id === id);
    return game ? { ...game, status: computeStatus(game) } : null;
  }

  addGame(input) {
    const game = TrackerRepository.create(input);
    this.games = TrackerRepository.getAll();
    this.emit({ type: 'game:add', id: game.id });
    return { ...game, status: computeStatus(game) };
  }

  updateGame(id, changes) {
    const game = TrackerRepository.update(id, changes);
    if (!game) return null;
    const index = this.games.findIndex((item) => item.id === id);
    if (index >= 0) this.games[index] = game;
    this.emit({ type: 'game:update', id });
    return { ...game, status: computeStatus(game) };
  }

  removeGame(id) {
    const removed = TrackerRepository.remove(id);
    if (!removed) return false;
    this.games = this.games.filter((game) => game.id !== id);
    this.emit({ type: 'game:remove', id });
    return true;
  }

  duplicateGame(id) {
    const source = this.getGame(id);
    if (!source) return null;
    const copy = {
      ...source,
      appId: source.appId,
      customName: `${source.customName || source.name} — bản sao`,
      pinned: false,
      duplicateOf: source.id,
      allowDuplicate: true
    };
    delete copy.id;
    return this.addGame(copy);
  }

  setFilters(changes) {
    this.preferences = TrackerRepository.savePreferences({
      filters: { ...this.preferences.filters, ...changes }
    });
    this.emit({ type: 'filters' });
  }

  resetFilters() {
    this.preferences = TrackerRepository.savePreferences({
      filters: {
        search: '',
        status: 'all',
        region: 'all',
        tag: 'all',
        collectionId: 'all',
        priceRange: 'all',
        pinned: false,
        sort: 'attention'
      }
    });
    this.emit({ type: 'filters' });
  }

  setViewMode(viewMode) {
    this.preferences = TrackerRepository.savePreferences({ viewMode });
    this.emit({ type: 'view' });
  }

  setDensity(density) {
    this.preferences = TrackerRepository.savePreferences({ density });
    this.emit({ type: 'view' });
  }

  createCollection(name) {
    const collection = TrackerRepository.createCollection(name);
    this.collections = TrackerRepository.getCollections();
    this.emit({ type: 'collections' });
    return collection;
  }

  removeCollection(id) {
    const removed = TrackerRepository.removeCollection(id);
    if (removed) this.reload();
    return removed;
  }
}

const trackerStore = new TrackerStore();

export { TrackerStore, trackerStore };
export default trackerStore;
