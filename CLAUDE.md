# Working guidance for this repo

## Edit in place, don't shadow

Before adding or changing behavior, search for an existing definition that already governs it (a rule, function, constant, config entry, etc.). If one exists, edit it directly in place — don't add a new one alongside it, and don't reach for an override/precedence mechanism (`!important`, a later duplicate, a special-case flag) to make the new one win over the old one. Only create a new definition if the thing genuinely doesn't exist yet.
