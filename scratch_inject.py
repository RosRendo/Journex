import os

with open('d:/Forex/journex/frontend/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = 'import SessionKillzones from "@/components/widgets/SessionKillzones";\n'
content = content.replace('import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";', 'import { VisualPositionSizer } from "@/components/widgets/VisualPositionSizer";\n' + import_stmt)

widget_stmt = '<div className="lg:col-span-1"><SessionKillzones /></div>'
content = content.replace('<div className="lg:col-span-1"><NewsCountdownWidget /></div>', '<div className="lg:col-span-1"><NewsCountdownWidget /></div>\n            ' + widget_stmt)

with open('d:/Forex/journex/frontend/app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
