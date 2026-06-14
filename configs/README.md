# Clinic configs

## One command (interactive)

```bash
make clinic
```

**Asks only:**
- Clinic full name
- City / town
- Street address
- Phone number
- Clinic email
- Output folder name

All other website text (tagline, hero, about, team bios) uses **placeholder copy** — edit `src/content/` in the new project later.

## One command (existing config)

```bash
make clinic NAME=bright-smile
```

## Create a config file manually

```bash
cp configs/bright-smile.example.json configs/acme-dental.json
# edit the JSON, then:
make clinic NAME=acme-dental
```
