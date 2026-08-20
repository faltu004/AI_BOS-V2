import si from "systeminformation";

export async function getInventory() {

    const os = await si.osInfo();
    const cpu = await si.cpu();
    const mem = await si.mem();
    const disks = await si.diskLayout();
    const graphics = await si.graphics();
    const system = await si.system();
    const bios = await si.bios();
    const network = await si.networkInterfaces();

    return {

        hostname: os.hostname,

        os: os.distro,

        version: os.release,

        arch: os.arch,

        cpu,

        memory: mem.total,

        disks,

        graphics,

        system,

        bios,

        network

    };

}