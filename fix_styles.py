import os, glob, re
for f in glob.glob('frontend/src/components/*.jsx') + ['frontend/src/App.jsx']:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Text colors
    content = re.sub(r'color:\s*[\"\'\']rgba\(255,\s*255,\s*255,\s*(0\.[4-9]\d*|1\.0)\)[\"\'\']', 'color: "var(--text-primary)"', content)
    content = re.sub(r'color:\s*[\"\'\']rgba\(255,\s*255,\s*255,\s*0\.[1-3]\d*\)[\"\'\']', 'color: "var(--text-secondary)"', content)
    content = re.sub(r'color:\s*[\"\'\']#fff(?:fff)?[\"\'\']', 'color: "var(--text-primary)"', content)
    
    # Backgrounds and borders
    content = re.sub(r'background(?:Color)?:\s*[\"\'\']rgba\(255,\s*255,\s*255,\s*0\.0[1-4]\)[\"\'\']', 'background: "var(--bg-surface)"', content)
    content = re.sub(r'background(?:Color)?:\s*[\"\'\']rgba\(255,\s*255,\s*255,\s*0\.0[5-9]\)[\"\'\']', 'background: "var(--bg-surface-hover)"', content)
    content = re.sub(r'border:\s*[\"\'\']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-2]\d*\)[\"\'\']', 'border: "1px solid var(--border-subtle)"', content)
    content = re.sub(r'borderTop:\s*[\"\'\']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-2]\d*\)[\"\'\']', 'borderTop: "1px solid var(--border-subtle)"', content)
    content = re.sub(r'borderBottom:\s*[\"\'\']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-2]\d*\)[\"\'\']', 'borderBottom: "1px solid var(--border-subtle)"', content)
    content = re.sub(r'borderLeft:\s*[\"\'\']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-2]\d*\)[\"\'\']', 'borderLeft: "1px solid var(--border-subtle)"', content)
    content = re.sub(r'borderRight:\s*[\"\'\']1px solid rgba\(255,\s*255,\s*255,\s*0\.[0-2]\d*\)[\"\'\']', 'borderRight: "1px solid var(--border-subtle)"', content)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Done")
