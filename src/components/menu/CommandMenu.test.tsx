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
    expect(mockDevelopCommerce).toHaveBeenCalledWith(1, 1);
  });

  describe('Personnel UI: ruler/governor/advisor rendering', () => {
    function renderPersonnel(overrides: Record<string, unknown> = {}) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockFn = useGameStore as any;
      mockFn.mockReturnValue({
        ...mockFn(),
        activeCommandCategory: 'personnel',
        selectedCityId: 1,
        playerFaction: { id: 1, rulerId: 100, advisorId: 200, allies: [], relations: {} },
        officers: [
          { id: 100, name: '劉備', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 100, rank: 'viceroy', skills: [] },
          { id: 200, name: '諸葛亮', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 100, rank: 'advisor', skills: [] },
          { id: 300, name: '關羽', cityId: 1, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'general', skills: [] },
          { id: 400, name: '張飛', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 90, rank: 'common', skills: [] },
        ],
        factions: [
          { id: 1, name: '劉備', rulerId: 100, advisorId: 200, color: '#16a34a', relations: {}, allies: [] },
        ],
        ...overrides,
      });
      return render(<CommandMenu />);
    }

    it('ruler shows ruler badge AND governor badge, not other controls', () => {
      renderPersonnel();
      const rulerRow = screen.getByText('劉備').closest('.officer-row');
      expect(rulerRow).toBeTruthy();
      // Ruler badge should be present
      expect(screen.getByText('command.personnel.rulerLabel')).toBeDefined();
      // R-001: ruler IS the governor — governor badge should also appear
      const govBadges = rulerRow!.querySelectorAll('.role-badge.governor');
      expect(govBadges.length).toBe(1);
      // No governor/advisor buttons in ruler row
      const buttons = rulerRow!.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent);
      expect(btnTexts).not.toContain('command.personnel.appointGovernor');
      expect(btnTexts).not.toContain('command.personnel.appointAdvisor');
      // No rank select in ruler row
      const selects = rulerRow!.querySelectorAll('select');
      // Only the transfer select should be present
      expect(selects.length).toBe(1);
      // No dismiss button for ruler
      expect(btnTexts).not.toContain('command.personnel.dismiss');
    });

    it('R-001: no governor button for non-ruler officers when ruler is in city', () => {
      renderPersonnel(); // ruler (id 100) is in city 1
      // 張飛 is a regular officer in the same city as the ruler
      const regularRow = screen.getByText('張飛').closest('.officer-row');
      expect(regularRow).toBeTruthy();
      const buttons = regularRow!.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent);
      // Cannot appoint governor when ruler is in city
      expect(btnTexts).not.toContain('command.personnel.appointGovernor');
      // Should still have advisor button
      expect(btnTexts).toContain('command.personnel.appointAdvisor');
    });

    it('governor shows governor badge instead of governor button', () => {
      // Test in a city WITHOUT the ruler so governor badge/button logic applies
      renderPersonnel({
        playerFaction: { id: 1, rulerId: 100, advisorId: 200, allies: [], relations: {} },
        officers: [
          { id: 100, name: '劉備', cityId: 99, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'viceroy', skills: [] },
          { id: 200, name: '諸葛亮', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 100, rank: 'advisor', skills: [] },
          { id: 300, name: '關羽', cityId: 1, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'general', skills: [] },
          { id: 400, name: '張飛', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 90, rank: 'common', skills: [] },
        ],
      });
      const govRow = screen.getByText('關羽').closest('.officer-row');
      expect(govRow).toBeTruthy();
      // Should have a governor badge (span with role-badge class)
      const badges = govRow!.querySelectorAll('.role-badge.governor');
      expect(badges.length).toBe(1);
      // Should NOT have a governor button
      const buttons = govRow!.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent);
      expect(btnTexts).not.toContain('command.personnel.appointGovernor');
      // Should still have advisor button (關羽 is not the advisor)
      expect(btnTexts).toContain('command.personnel.appointAdvisor');
    });

    it('advisor shows advisor badge instead of advisor button', () => {
      // Test in a city WITHOUT the ruler so governor button logic applies
      renderPersonnel({
        playerFaction: { id: 1, rulerId: 100, advisorId: 200, allies: [], relations: {} },
        officers: [
          { id: 100, name: '劉備', cityId: 99, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'viceroy', skills: [] },
          { id: 200, name: '諸葛亮', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 100, rank: 'advisor', skills: [] },
          { id: 300, name: '關羽', cityId: 1, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'general', skills: [] },
          { id: 400, name: '張飛', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 90, rank: 'common', skills: [] },
        ],
      });
      const advisorRow = screen.getByText('諸葛亮').closest('.officer-row');
      expect(advisorRow).toBeTruthy();
      // Should have an advisor badge
      const badges = advisorRow!.querySelectorAll('.role-badge.advisor');
      expect(badges.length).toBe(1);
      // Should NOT have advisor button
      const buttons = advisorRow!.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent);
      expect(btnTexts).not.toContain('command.personnel.appointAdvisor');
      // Should still have governor button (諸葛亮 is not governor, ruler not in this city)
      expect(btnTexts).toContain('command.personnel.appointGovernor');
    });

    it('regular officer shows both governor and advisor buttons', () => {
      // Test in a city WITHOUT the ruler so governor button appears
      renderPersonnel({
        playerFaction: { id: 1, rulerId: 100, advisorId: 200, allies: [], relations: {} },
        officers: [
          { id: 100, name: '劉備', cityId: 99, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'viceroy', skills: [] },
          { id: 200, name: '諸葛亮', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 100, rank: 'advisor', skills: [] },
          { id: 300, name: '關羽', cityId: 1, factionId: 1, isGovernor: true, acted: false, loyalty: 100, rank: 'general', skills: [] },
          { id: 400, name: '張飛', cityId: 1, factionId: 1, isGovernor: false, acted: false, loyalty: 90, rank: 'common', skills: [] },
        ],
      });
      const regularRow = screen.getByText('張飛').closest('.officer-row');
      expect(regularRow).toBeTruthy();
      const buttons = regularRow!.querySelectorAll('button');
      const btnTexts = Array.from(buttons).map(b => b.textContent);
      expect(btnTexts).toContain('command.personnel.appointGovernor');
      expect(btnTexts).toContain('command.personnel.appointAdvisor');
      // Should have dismiss button
      expect(btnTexts).toContain('command.personnel.dismiss');
      // Should have rank select + transfer select = 2 selects
      const selects = regularRow!.querySelectorAll('select');
      expect(selects.length).toBe(2);
    });
  });
});
