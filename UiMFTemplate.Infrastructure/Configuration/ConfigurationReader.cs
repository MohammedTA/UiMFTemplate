namespace UiMFTemplate.Infrastructure.Configuration
{
	using System.IO;
	using Microsoft.EntityFrameworkCore;
	using Microsoft.Extensions.Configuration;

	public static class ConfigurationReader
	{
		public static DbContextOptions DbContextOptions(this IConfiguration configRoot)
		{
			var connectionString = configRoot.GetConnectionString("UiMFTemplate");
			return new DbContextOptionsBuilder().UseSqlServer(connectionString).Options;
		}

		public static IConfiguration GetConfigurations()
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", false);

			return builder.Build();
		}

		public static T GetSection<T>(this IConfiguration root)
			where T : class, new()
		{
			var result = new T();
			root.GetSection(nameof(AppConfig)).Bind(result);
			return result;
		}
	}
}
