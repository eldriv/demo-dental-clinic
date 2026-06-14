# One command to scaffold a new clinic (website + dashboard) under ~/dev/
#
#   make clinic          ← interactive prompts (name, location, email, etc.)
#   make clinic NAME=bright-smile

NAME ?=
CONFIG ?=

.PHONY: help clinic new-clinic generate assets print-out

.DEFAULT_GOAL := help

help:
	@echo "Dental clinic template"
	@echo ""
	@echo "  make clinic"
	@echo "      Asks: name, city, address, phone, email, folder name"
	@echo "      Website copy uses placeholder text — edit src/content/ later"
	@echo ""
	@echo "  make clinic DEV=1"
	@echo "      Interactive + start dev server when finished"
	@echo ""
	@echo "  make clinic NAME=bright-smile"
	@echo "      Use existing configs/bright-smile.json (no prompts)"
	@echo ""
	@echo "  make print-out NAME=bright-smile"
	@echo "      Preview output path only"

clinic:
	node scripts/make-clinic.mjs \
		$(if $(strip $(CONFIG)),--config $(CONFIG),) \
		$(if $(strip $(NAME)),--name $(NAME),) \
		$(if $(filter 1,$(DEV)),--dev,)

print-out:
	@node scripts/print-scaffold-out.mjs \
		$(if $(strip $(CONFIG)),--config $(CONFIG),) \
		$(if $(strip $(NAME)),--name $(NAME),)

new-clinic: clinic

generate:
	@test -n "$(NAME)$(CONFIG)" || (echo "Pass NAME=... or CONFIG=..." && exit 1)
	node scripts/generate-from-config.mjs \
		$(if $(strip $(CONFIG)),--config $(CONFIG),--config configs/$(NAME).json)

assets:
	@test -n "$(NAME)$(CONFIG)" || (echo "Pass NAME=... or CONFIG=..." && exit 1)
	node scripts/generate-from-config.mjs \
		$(if $(strip $(CONFIG)),--config $(CONFIG),--config configs/$(NAME).json) \
		--assets-only
