using System;
using System.Linq;
using System.Windows.Navigation;

internal class CompositeUriMapper : UriMapperBase
{
    public static string launchUrl;

	public override Uri MapUri(Uri uri)
	{
        string launchUri = uri.ToString();
        if (launchUri.StartsWith("/Protocol?encodedLaunchUri="))
        {
            int launchUrlIndex = launchUri.IndexOf("encodedLaunchUri=");
            launchUrl = System.Net.HttpUtility.UrlDecode(launchUri.Substring(launchUrlIndex+17));
            return new Uri("/MainPage.xaml", UriKind.Relative);
        }
		var assemblies = AppDomain.CurrentDomain.GetAssemblies();
		var types = assemblies.SelectMany(a =>
		{
			try
			{
				return a.ExportedTypes.Where(et => typeof(ICustomUriMapper).IsAssignableFrom(et));
			}
			catch
			{
				return Enumerable.Empty<Type>();
			}
		});

		foreach (var type in types)
		{
			if (type != typeof(ICustomUriMapper))
			{
				var worker = (ICustomUriMapper)Activator.CreateInstance(type);
				var mappedUri = worker.CustomMapUri(uri);
				if (mappedUri != null)
				{
					return mappedUri;
	            }
			}
		}

		return uri;
	}
}