import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandMenu } from './CommandMenu';
import { useGameStore } from '../../store/gameStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) {
        return Object.entries(opts).reduce(
          (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
          key
        );
      }
      return key;
    },
    i18n: { language: 'zh-TW', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../i18n/dataNames', () => ({
  localizedName: (name: string) => name,
}));

vi.mock('../../store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

// Mock the dialogs to avoid deep rendering issues
vi.mock('../FormationDialog', () => ({
  FormationDialog: () => <div data-testid="formation-dialog" />,
}));
vi.mock('../TransportDialog', () => ({
  TransportDialog: () => <div data-testid="transport-dialog" />,
}));

describe('CommandMenu', () => {
  const mockSetActiveCommandCategory = vi.fn();
  const mockEndTurn = vi.fn();
  const mockDevelopCommerce = vi.fn();
  const mockAddLog = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useGameStore as any).mockReturnValue({
      selectedCityId: 1,
      cities: [
        { id: 1, name: '許昌', factionId: 1, adjacentCityIds: [2], taxRate: 'medium' },
        { id: 2, name: '洛陽', factionId: 2, adjacentCityIds: [1], taxRate: 'medium' },
      ],
      officers: [
        { id: 1, name: '荀彧', cityId: 1, factionId: 1, isGovernor: true, acted: false, loyalty: 100, skills: ['manufacture'] },
      ],
      factions: [
        { id: 1, name: '曹操', color: '#ff0000', relations: { 2: 60 }, allies: [] },
        { id: 2, name: '董卓', color: '#0000ff', relations: { 1: 60 }, allies: [] },
      ],
      playerFaction: { id: 1 },
      activeCommandCategory: null,
      setActiveCommandCategory: mockSetActiveCommandCategory,
      endTurn: mockEndTurn,
      developCommerce: mockDevelopCommerce,
      addLog: mockAddLog,
      developAgriculture: vi.fn(),
      reinforceDefense: vi.fn(),
      developFloodControl: vi.fn(),
      developTechnology: vi.fn(),
      trainTroops: vi.fn(),
      manufacture: vi.fn(),
      disasterRelief: vi.fn(),
      recruitOfficer: vi.fn(), 
      recruitPOW: vi.fn(),
      rewardOfficer: vi.fn(),
      executeOfficer: vi.fn(),
      dismissOfficer: vi.fn(),
      appointGovernor: vi.fn(),
      appointAdvisor: vi.fn(),
      transferOfficer: vi.fn(),
      draftTroops: vi.fn(),
      startDuel: vi.fn(),
      startBattle: vi.fn(),
      searchOfficer: vi.fn(),
      recruitOfficerByName: vi.fn(),
      recruitOfficerByItem: vi.fn(),
      improveRelations: vi.fn(),
      formAlliance: vi.fn(),
      requestJointAttack: vi.fn(),
      proposeCeasefire: vi.fn(),
      demandSurrender: vi.fn(),
      breakAlliance: vi.fn(),
      exchangeHostage: vi.fn(),
      counterEspionage: vi.fn(),
      inciteRebellion: vi.fn(),
      arson: vi.fn(),
      spy: vi.fn(),
      gatherIntelligence: vi.fn(),
      rumor: vi.fn(),
      setTaxRate: vi.fn(),
      promoteOfficer: vi.fn(),
    });
  });

  it('renders categories', () => {
    render(<CommandMenu />);
    expect(screen.getByText('command.category.domestic')).toBeDefined();
    expect(screen.getByText('command.category.military')).toBeDefined();
    expect(screen.getByText('command.category.end')).toBeDefined();
  });

  it('switches categories', () => {
    render(<CommandMenu />);
    fireEvent.click(screen.getByText('command.category.domestic'));
    expect(mockSetActiveCommandCategory).toHaveBeenCalledWith('domestic');
  });

  it('renders actions when category is active', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFn = useGameStore as any;
    mockFn.mockReturnValue({
      ...mockFn(),
      activeCommandCategory: 'domestic',
      selectedCityId: 1,
      cities: [{ id: 1, name: '許昌', factionId: 1, adjacentCityIds: [2] }],
      playerFaction: { id: 1 },
      officers: [{ id: 1, name: '荀彧', cityId: 1, factionId: 1, isGovernor: true, skills: ['manufacture'] }],
      developCommerce: mockDevelopCommerce,
    });
    
    render(<CommandMenu />);
    expect(screen.getByText('command.domestic.developCommerce')).toBeDefined();
    
    fireEvent.click(screen.getByText('command.domestic.developCommerce'));
    const officerCell = screen.getByText('荀彧');
    const officerRow = officerCell.closest('tr');
    expect(officerRow).toBeTruthy();
    if (officerRow) {
      fireEvent.click(officerRow);
    }
    expect(mockDevelopCommerce).toHaveBeenCalledWith(1);
  });
});
