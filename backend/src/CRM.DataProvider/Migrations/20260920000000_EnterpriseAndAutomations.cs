using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CRM.DataProvider.Migrations
{
    /// <inheritdoc />
    public partial class EnterpriseAndAutomations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Organizations
            migrationBuilder.AddColumn<string>(
                name: "WebhookApiKey",
                table: "Organizations",
                type: "longtext",
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "AutoAssignRoundRobin",
                table: "Organizations",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "StaleDealThresholdDays",
                table: "Organizations",
                type: "int",
                nullable: false,
                defaultValue: 14);

            // Leads
            migrationBuilder.AddColumn<DateTime>(
                name: "ExpectedCloseDate",
                table: "Leads",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloseReason",
                table: "Leads",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Leads",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Leads",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastContactedAt",
                table: "Leads",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Score",
                table: "Leads",
                type: "int",
                nullable: false,
                defaultValue: 50);

            // Contacts
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Contacts",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Contacts",
                type: "datetime(6)",
                nullable: true);

            // Users
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Users",
                type: "datetime(6)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "WebhookApiKey", table: "Organizations");
            migrationBuilder.DropColumn(name: "AutoAssignRoundRobin", table: "Organizations");
            migrationBuilder.DropColumn(name: "StaleDealThresholdDays", table: "Organizations");

            migrationBuilder.DropColumn(name: "ExpectedCloseDate", table: "Leads");
            migrationBuilder.DropColumn(name: "CloseReason", table: "Leads");
            migrationBuilder.DropColumn(name: "IsDeleted", table: "Leads");
            migrationBuilder.DropColumn(name: "DeletedAt", table: "Leads");
            migrationBuilder.DropColumn(name: "LastContactedAt", table: "Leads");
            migrationBuilder.DropColumn(name: "Score", table: "Leads");

            migrationBuilder.DropColumn(name: "IsDeleted", table: "Contacts");
            migrationBuilder.DropColumn(name: "DeletedAt", table: "Contacts");

            migrationBuilder.DropColumn(name: "IsDeleted", table: "Users");
            migrationBuilder.DropColumn(name: "DeletedAt", table: "Users");
        }
    }
}
