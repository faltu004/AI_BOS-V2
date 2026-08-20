import dns from "node:dns";

export type DnsAddressRecord = {
  address: string;
  family: 4 | 6;
};

export function isLinkLocalIpv6(
  address: string,
): boolean {
  return /^fe80:/i.test(
    address.trim(),
  );
}

export function preferOperationalDnsAddresses<
  T extends DnsAddressRecord,
>(addresses: T[]): T[] {
  return [...addresses].sort(
    (left, right) => {
      const leftLinkLocal =
        left.family === 6 &&
        isLinkLocalIpv6(
          left.address,
        );
      const rightLinkLocal =
        right.family === 6 &&
        isLinkLocalIpv6(
          right.address,
        );

      if (
        leftLinkLocal !==
        rightLinkLocal
      ) {
        return leftLinkLocal
          ? 1
          : -1;
      }

      if (
        left.family !==
        right.family
      ) {
        return left.family === 4
          ? -1
          : 1;
      }

      return 0;
    },
  );
}

export function configureNetworkAddressSelection():
  void {
  /*
   * Preserve TLS hostname validation while preventing Windows DNS answers
   * such as fe80:: link-local IPv6 from winning over the usable IPv4 address
   * for ADMIN-WORKNAI.
   */
  dns.setDefaultResultOrder(
    "ipv4first",
  );
}
