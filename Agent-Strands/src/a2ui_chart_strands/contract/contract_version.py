# Shipped DEFAULT contract versions — overwritten before every deploy.
#
# CONTROL_VERSION / DATASHAPE_VERSION are HANDSHAKE DRIFT TOKENS, nothing more:
# the frontend fires a version check on mount, compares these byte-for-byte to
# its own baked versions, and DISABLES chart input on mismatch. They carry no
# meaning on their own — their only job is to equal the other side.
#
# The values below are deliberate MOCK placeholders so no one mistakes the
# package default for authoritative. The real, matching versions are owned by
# the DEPLOYMENT: the pre-deploy generator reads A2UI_catalog_src/*.json and
# writes them into BOTH the frontend and this agent. Deploy without regenerating
# and the mock fails the handshake loudly (input disabled) — by design.
CONTROL_VERSION = "MOCK.control.regen-before-deploy"
DATASHAPE_VERSION = "MOCK.datashape.regen-before-deploy"
CATALOG_ID = "https://github.com/haystackedai/a2ui/catalogs/v0_9/catalog.json"
