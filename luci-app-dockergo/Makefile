include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for DockerGo
LUCI_DEPENDS:=@(aarch64||arm||x86_64) \
	+luci-base \
	+luci-compat \
	+luci-lib-taskd \
	+docker \
	+dockerd
LUCI_PKGARCH:=all
LUCI_MINIFY_JS:=0
LUCI_MINIFY_CSS:=0

PKG_LICENSE:=GPL-2.0-or-later
PKG_MAINTAINER:=DockerGo contributors
PKG_VERSION:=0.1.0
PKG_RELEASE:=29

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
