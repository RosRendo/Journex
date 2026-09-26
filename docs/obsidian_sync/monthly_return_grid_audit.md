# Monthly Return Grid Data & Layout Audit (Resolved)

**Component**: `frontend/components/dashboard/widgets/MonthlyPerformanceGrid.tsx`  
**Page Location**: `http://localhost:3000/analytics` (Lens 1: Performance & Growth)  
**Parent Container**: `frontend/app/analytics/page.tsx` (`lg:col-span-4` next to `CalendarHeatmap` `lg:col-span-8`)  
**Status**: Resolved & Upgraded

---

## 1. Root Cause of the Bug
The user provided a screenshot showing:
- 6 skinny, squished pills (`APR 26`, `MAY 26`, `JUN 26`, `JUL 26`, `AUG 26`, `SEP 26`).
- Numbers colliding horizontally into an overlapping mess (`-$90-$20$187$399$4559$58`).
- 50% of the card on the right empty.

### Why It Happened:
The component had `className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2"`.
When placed in a 4-column sidebar (`lg:col-span-4` ~350px wide), `lg:grid-cols-12` forced **12 columns into 350px**, making each column only **~27 pixels wide**. The text values (`-$4559`) were 50–70px wide, causing severe horizontal collisions and text overflow.

---

## 2. Upgrades Implemented

1. **Responsive Card Grid (`grid-cols-2 sm:grid-cols-3 gap-2.5`)**:
   - Replaced `lg:grid-cols-12` with a container-adaptive layout.
   - Each card now has ample width (~100–120px) to display clean, unclipped text.
2. **YTD Net Return Header**:
   - Added a top summary badge showing total cumulative P&L (`-$4,637.83` / `3,694 trades`).
3. **Card Metrics**:
   - Clean Month Tag (`APR '26`, `MAY '26`, etc.).
   - Win Rate badge (`42% WR`).
   - Formatted Net P&L in crisp font with commas and signs (`+$399.00`, `-$4,559.08`).
   - Smooth mini progress bar with green/red theme.
   - Trade count & W/L ratio (`3,356 trades · 1280W · 2076L`).
4. **Footer Legend**:
   - Shows Profit Period, Loss Period indicators, and Average Win Rate.
