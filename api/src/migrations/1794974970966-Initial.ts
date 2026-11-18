import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1794974970966 implements MigrationInterface {
    name = 'Initial1794974970966'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`buses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`plate\` varchar(30) NOT NULL, \`type\` varchar(60) NULL, \`seat_count\` int NOT NULL, \`owner_name\` varchar(100) NULL, \`owner_phone\` varchar(30) NULL, UNIQUE INDEX \`IDX_1da765de924476580123f727ae\` (\`plate\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`routes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`station_id\` int NOT NULL, \`destination_city_id\` int NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_d87244072ab0b9eeb7ef2d0fb6\` (\`station_id\`, \`destination_city_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`stations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`city_id\` int NOT NULL, \`name\` varchar(150) NOT NULL, \`district\` varchar(100) NULL, \`landmark\` varchar(200) NULL, \`latitude\` decimal(10,7) NULL, \`longitude\` decimal(10,7) NULL, \`contact_name\` varchar(100) NULL, \`contact_phone\` varchar(30) NULL, \`opening_hours\` varchar(100) NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_d74feea70beeb66ae1e7596f86\` (\`city_id\`, \`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cities\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`name\` varchar(100) NOT NULL, \`region\` varchar(100) NULL, UNIQUE INDEX \`IDX_a0ae8d83b7d32359578c486e7f\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`station_id\` int NULL, \`name\` varchar(100) NOT NULL, \`phone\` varchar(30) NOT NULL, \`role\` enum ('admin', 'manager') NOT NULL DEFAULT 'manager', \`pin_hash\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`IDX_a000cca60bcf04454e72769949\` (\`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`trips\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`route_id\` int NOT NULL, \`bus_id\` int NOT NULL, \`driver_name\` varchar(100) NULL, \`driver_phone\` varchar(30) NULL, \`queue_position\` int NULL, \`arrived_at\` datetime NOT NULL, \`departure_time\` datetime NULL, \`status\` enum ('waiting', 'boarding', 'departed', 'cancelled') NOT NULL DEFAULT 'waiting', \`departed_at\` datetime NULL, \`created_by\` int NOT NULL, INDEX \`IDX_05e8a86f769fb6909ba1054da9\` (\`route_id\`, \`status\`, \`queue_position\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`passengers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL, \`updated_at\` datetime(6) NOT NULL, \`deleted_at\` datetime(6) NULL, \`trip_id\` int NOT NULL, \`name\` varchar(100) NOT NULL, \`phone\` varchar(30) NOT NULL, \`seats\` int NOT NULL DEFAULT '1', \`status\` enum ('active', 'cancelled') NOT NULL DEFAULT 'active', \`created_by\` int NOT NULL, INDEX \`IDX_2069567a79248254d27ae8ba4e\` (\`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD CONSTRAINT \`FK_a2036591a9c71c7ecfe0103c87c\` FOREIGN KEY (\`station_id\`) REFERENCES \`stations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD CONSTRAINT \`FK_ad2bbe84685d18c35889367087b\` FOREIGN KEY (\`destination_city_id\`) REFERENCES \`cities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stations\` ADD CONSTRAINT \`FK_70b32efafe7f416d2646d95de43\` FOREIGN KEY (\`city_id\`) REFERENCES \`cities\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`users\` ADD CONSTRAINT \`FK_bdfe745b37e9669be5678d2cc11\` FOREIGN KEY (\`station_id\`) REFERENCES \`stations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`trips\` ADD CONSTRAINT \`FK_e49dbbd9991c9b7baec9779e7ce\` FOREIGN KEY (\`route_id\`) REFERENCES \`routes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`trips\` ADD CONSTRAINT \`FK_de94f3218372c5bdfe1638c07c3\` FOREIGN KEY (\`bus_id\`) REFERENCES \`buses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`trips\` ADD CONSTRAINT \`FK_123140f8070e5c436bef866a380\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`passengers\` ADD CONSTRAINT \`FK_37fb5a2274c229840e2f6698092\` FOREIGN KEY (\`trip_id\`) REFERENCES \`trips\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`passengers\` ADD CONSTRAINT \`FK_e08a766641f668557cdd048aa20\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`passengers\` DROP FOREIGN KEY \`FK_e08a766641f668557cdd048aa20\``);
        await queryRunner.query(`ALTER TABLE \`passengers\` DROP FOREIGN KEY \`FK_37fb5a2274c229840e2f6698092\``);
        await queryRunner.query(`ALTER TABLE \`trips\` DROP FOREIGN KEY \`FK_123140f8070e5c436bef866a380\``);
        await queryRunner.query(`ALTER TABLE \`trips\` DROP FOREIGN KEY \`FK_de94f3218372c5bdfe1638c07c3\``);
        await queryRunner.query(`ALTER TABLE \`trips\` DROP FOREIGN KEY \`FK_e49dbbd9991c9b7baec9779e7ce\``);
        await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_bdfe745b37e9669be5678d2cc11\``);
        await queryRunner.query(`ALTER TABLE \`stations\` DROP FOREIGN KEY \`FK_70b32efafe7f416d2646d95de43\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP FOREIGN KEY \`FK_ad2bbe84685d18c35889367087b\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP FOREIGN KEY \`FK_a2036591a9c71c7ecfe0103c87c\``);
        await queryRunner.query(`DROP INDEX \`IDX_2069567a79248254d27ae8ba4e\` ON \`passengers\``);
        await queryRunner.query(`DROP TABLE \`passengers\``);
        await queryRunner.query(`DROP INDEX \`IDX_05e8a86f769fb6909ba1054da9\` ON \`trips\``);
        await queryRunner.query(`DROP TABLE \`trips\``);
        await queryRunner.query(`DROP INDEX \`IDX_a000cca60bcf04454e72769949\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_a0ae8d83b7d32359578c486e7f\` ON \`cities\``);
        await queryRunner.query(`DROP TABLE \`cities\``);
        await queryRunner.query(`DROP INDEX \`IDX_d74feea70beeb66ae1e7596f86\` ON \`stations\``);
        await queryRunner.query(`DROP TABLE \`stations\``);
        await queryRunner.query(`DROP INDEX \`IDX_d87244072ab0b9eeb7ef2d0fb6\` ON \`routes\``);
        await queryRunner.query(`DROP TABLE \`routes\``);
        await queryRunner.query(`DROP INDEX \`IDX_1da765de924476580123f727ae\` ON \`buses\``);
        await queryRunner.query(`DROP TABLE \`buses\``);
    }

}
